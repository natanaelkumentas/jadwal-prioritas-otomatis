import net from 'net';
import tls from 'tls';
import crypto from 'crypto';

export interface PgColumn {
  name: string;
}

export interface PgQueryResult {
  rows: Record<string, any>[];
  rowCount: number;
}

export class PurePgClient {
  private host: string;
  private port: number;
  private user: string;
  private password: string;
  private database: string;
  private socket: tls.TLSSocket | null = null;

  constructor(connectionString: string) {
    const url = new URL(connectionString);
    this.host = url.hostname;
    this.port = parseInt(url.port || '5432', 10);
    this.user = decodeURIComponent(url.username);
    this.password = decodeURIComponent(url.password);
    this.database = url.pathname.replace(/^\//, '') || 'postgres';
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const rawSocket = net.connect({ host: this.host, port: this.port }, () => {
        // 1. Send SSLRequest (80877103)
        const sslReq = Buffer.alloc(8);
        sslReq.writeInt32BE(8, 0);
        sslReq.writeInt32BE(80877103, 4);
        rawSocket.write(sslReq);
      });

      rawSocket.once('error', reject);

      rawSocket.once('data', (data) => {
        const responseCode = data.toString('ascii', 0, 1);
        if (responseCode !== 'S') {
          return reject(new Error('Server does not support SSL connections.'));
        }

        // 2. Upgrade to TLS
        const tlsSocket = tls.connect({
          socket: rawSocket,
          servername: this.host,
          rejectUnauthorized: false
        }, () => {
          this.socket = tlsSocket;
          this.performHandshake().then(resolve).catch(reject);
        });

        tlsSocket.on('error', reject);
      });
    });
  }

  private async performHandshake(): Promise<void> {
    const socket = this.socket!;

    // Send StartupMessage
    const pairs = [
      ['user', this.user],
      ['database', this.database],
      ['client_encoding', 'UTF8']
    ];
    let payloadLen = 4; // protocolVersion (Int32)
    pairs.forEach(([k, v]) => {
      payloadLen += Buffer.byteLength(k, 'utf8') + 1 + Buffer.byteLength(v, 'utf8') + 1;
    });
    payloadLen += 1; // terminating null

    const totalLen = 4 + payloadLen;
    const buf = Buffer.alloc(totalLen);
    buf.writeInt32BE(totalLen, 0);
    buf.writeInt32BE(196608, 4); // Protocol 3.0

    let offset = 8;
    for (const [k, v] of pairs) {
      buf.write(k, offset, 'utf8');
      offset += Buffer.byteLength(k, 'utf8');
      buf.writeInt8(0, offset++);
      buf.write(v, offset, 'utf8');
      offset += Buffer.byteLength(v, 'utf8');
      buf.writeInt8(0, offset++);
    }
    buf.writeInt8(0, offset);
    socket.write(buf);

    return new Promise((resolve, reject) => {
      const onData = (chunk: Buffer) => {
        let ptr = 0;
        while (ptr < chunk.length) {
          const type = String.fromCharCode(chunk[ptr]);
          const len = chunk.readInt32BE(ptr + 1);

          if (type === 'R') {
            // Authentication request
            const authType = chunk.readInt32BE(ptr + 5);
            if (authType === 0) {
              // Auth OK
            } else if (authType === 3) {
              // Cleartext password
              this.sendPasswordPacket(this.password);
            } else if (authType === 5) {
              // MD5 password
              const salt = chunk.slice(ptr + 9, ptr + 13);
              const hash1 = crypto.createHash('md5').update(this.password + this.user).digest('hex');
              const hash2 = crypto.createHash('md5').update(hash1 + salt.toString('binary'), 'binary').digest('hex');
              this.sendPasswordPacket('md5' + hash2);
            } else {
              cleanup();
              return reject(new Error(`Unsupported auth type: ${authType}`));
            }
          } else if (type === 'Z') {
            // ReadyForQuery
            cleanup();
            return resolve();
          } else if (type === 'E') {
            cleanup();
            const errMsg = chunk.toString('utf8', ptr + 5, ptr + 1 + len);
            return reject(new Error(`Postgres Auth Error: ${errMsg}`));
          }
          ptr += 1 + len;
        }
      };

      const cleanup = () => {
        socket.removeListener('data', onData);
      };

      socket.on('data', onData);
    });
  }

  private sendPasswordPacket(passwordStr: string) {
    const passBuf = Buffer.from(passwordStr + '\0', 'utf8');
    const packet = Buffer.alloc(1 + 4 + passBuf.length);
    packet[0] = 'p'.charCodeAt(0);
    packet.writeInt32BE(4 + passBuf.length, 1);
    passBuf.copy(packet, 5);
    this.socket!.write(packet);
  }

  async query(sql: string): Promise<PgQueryResult> {
    if (!this.socket) throw new Error('Not connected');
    const socket = this.socket;

    const sqlBuf = Buffer.from(sql + '\0', 'utf8');
    const queryPacket = Buffer.alloc(1 + 4 + sqlBuf.length);
    queryPacket[0] = 'Q'.charCodeAt(0);
    queryPacket.writeInt32BE(4 + sqlBuf.length, 1);
    sqlBuf.copy(queryPacket, 5);

    socket.write(queryPacket);

    return new Promise((resolve, reject) => {
      let columns: PgColumn[] = [];
      const rows: Record<string, any>[] = [];
      let bufferAccum = Buffer.alloc(0);

      const onData = (chunk: Buffer) => {
        bufferAccum = Buffer.concat([bufferAccum, chunk]);

        while (bufferAccum.length >= 5) {
          const type = String.fromCharCode(bufferAccum[0]);
          const len = bufferAccum.readInt32BE(1);
          const totalPacketLen = 1 + len;

          if (bufferAccum.length < totalPacketLen) {
            break; // Wait for more data
          }

          const packet = bufferAccum.slice(0, totalPacketLen);
          bufferAccum = bufferAccum.slice(totalPacketLen);

          if (type === 'T') {
            // RowDescription
            const colCount = packet.readInt16BE(5);
            columns = [];
            let p = 7;
            for (let i = 0; i < colCount; i++) {
              const nullIdx = packet.indexOf(0, p);
              const colName = packet.toString('utf8', p, nullIdx);
              columns.push({ name: colName });
              p = nullIdx + 1 + 18; // skip table_id (4), col_attr (2), type_id (4), type_size (2), type_mod (4), format_code (2)
            }
          } else if (type === 'D') {
            // DataRow
            const colCount = packet.readInt16BE(5);
            let p = 7;
            const row: Record<string, any> = {};
            for (let i = 0; i < colCount; i++) {
              const colValLen = packet.readInt32BE(p);
              p += 4;
              if (colValLen === -1) {
                row[columns[i]?.name || `col_${i}`] = null;
              } else {
                const valStr = packet.toString('utf8', p, p + colValLen);
                p += colValLen;
                row[columns[i]?.name || `col_${i}`] = valStr;
              }
            }
            rows.push(row);
          } else if (type === 'E') {
            cleanup();
            return reject(new Error(`Query Error: ${packet.toString('utf8', 5)}`));
          } else if (type === 'Z') {
            cleanup();
            return resolve({ rows, rowCount: rows.length });
          }
        }
      };

      const cleanup = () => {
        socket.removeListener('data', onData);
      };

      socket.on('data', onData);
    });
  }

  async close(): Promise<void> {
    if (this.socket) {
      try {
        const term = Buffer.from(['X'.charCodeAt(0), 0, 0, 0, 4]);
        this.socket.write(term);
        this.socket.end();
      } catch {
        // ignore
      }
      this.socket = null;
    }
  }
}
