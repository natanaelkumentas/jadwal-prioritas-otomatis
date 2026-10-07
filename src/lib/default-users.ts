export interface StaticUser {
  name: string;
  email: string;
  password: string;
  role: 'developer' | 'admin' | 'user';
  group: string;
  subGroup: string;
}

export const DEFAULT_USERS: StaticUser[] = [
  { name: 'Developer Utama', email: 'natanaelkumentas03@gmail.com', password: 'ti7polimdo', role: 'developer', group: '-', subGroup: '-' },
  { name: 'Administrator Sistem', email: 'jadwal.airnav.mdc@gmail.com', password: 'magangairnavpolimdo2026', role: 'admin', group: '-', subGroup: '-' },
  { name: 'ALLAN M. LENGKONG', email: 'allan.m.lengkong@gmail.com', password: 'Al8wK4sP9N', role: 'user', group: 'CNS', subGroup: '4' },
  { name: 'ANDI NURFAJRIANA', email: 'andi.nurfajriana@gmail.com', password: 'An9xP5mL8K', role: 'user', group: 'CNS', subGroup: '3' },
  { name: 'BENEDITH KELVIN', email: 'benedith.kelvin@gmail.com', password: 'Bk8vR4qP6G', role: 'user', group: 'CNS', subGroup: '2' },
  { name: 'BHIMA ANDIKA PUTRA', email: 'bhima.andika.putra@gmail.com', password: 'Ba7vR3qL8C', role: 'user', group: 'ESS', subGroup: '5' },
  { name: 'DAVID K. NANDA', email: 'david.k.nanda@gmail.com', password: 'Dk8xT4mR6X', role: 'user', group: 'ESS', subGroup: '3' },
  { name: 'DEIVY TUMIIR', email: 'deivy.tumiir@gmail.com', password: 'Dv6pL2tR7M', role: 'user', group: 'CNS', subGroup: '4' },
  { name: 'EVAN SIPAYUNG', email: 'evan.sipayung@gmail.com', password: 'Es4xT8mR7B', role: 'user', group: 'ESS', subGroup: '5' },
  { name: 'FADJAR RAMADHAN', email: 'fadjar.ramadhan@gmail.com', password: 'Fj3pL7tW9H', role: 'user', group: 'CNS', subGroup: '2' },
  { name: 'GUNAWAN PRASETYO', email: 'gunawan.prasetyo@gmail.com', password: 'Gw5xT9mK3F', role: 'user', group: 'CNS', subGroup: '2' },
  { name: 'JEFRI RANTE', email: 'jefri.rante@gmail.com', password: 'Jr9xP5mL4T', role: 'user', group: 'ESS', subGroup: '1' },
  { name: 'JOP A. LIMBENG', email: 'jop.a.limbeng@gmail.com', password: 'Jp4vT8qW2L', role: 'user', group: 'CNS', subGroup: '3' },
  { name: 'KURNIAWAN JAMAL', email: 'kurniawan.jamal@gmail.com', password: 'Kj5xT9mR3P', role: 'user', group: 'CNS', subGroup: '4' },
  { name: 'MELKIAS TARRU PADANG', email: 'melkias.tarru.padang@gmail.com', password: 'Mt7wK2sR4J', role: 'user', group: 'CNS', subGroup: '3' },
  { name: 'MICHAELOVERYAN MONE', email: 'michaeloveryan.mone@gmail.com', password: 'Mc9pL3yR5C', role: 'user', group: 'CNS', subGroup: '1' },
  { name: 'Natan', email: 'natanaelkumentas11@gmail.com', password: 'Nk8xP2mQ4D', role: 'user', group: 'CNS', subGroup: '-' },
  { name: 'NURJANNAH', email: 'nurjannah@gmail.com', password: 'Nj6wP2sL7E', role: 'user', group: 'CNS', subGroup: '1' },
  { name: 'PRABOWO DARMINTO', email: 'prabowo.darminto@gmail.com', password: 'Pd5wK9sP3W', role: 'user', group: 'ESS', subGroup: '2' },
  { name: 'PRAYOGO WICAKSONO', email: 'prayogo.wicaksono@gmail.com', password: 'Pw4pL8tW2R', role: 'user', group: 'CNS', subGroup: '5' },
  { name: 'RHIDO NAINGGOLAN', email: 'rhido.nainggolan@gmail.com', password: 'Rn7vR3qL6Q', role: 'user', group: 'CNS', subGroup: '5' },
  { name: 'RIDWAN', email: 'ridwan@gmail.com', password: 'Rd7vW4qT8B', role: 'user', group: 'CNS', subGroup: '1' },
  { name: 'RIZKY SEBAYANG', email: 'rizky.sebayang@gmail.com', password: 'Rs6pL2tW5Z', role: 'user', group: 'ESS', subGroup: '4' },
  { name: 'ROBBY AKBAR', email: 'robby.akbar@gmail.com', password: 'Rb4nK8tW2D', role: 'user', group: 'CNS', subGroup: '1' },
  { name: 'SEACHER JUNEDI', email: 'seacher.junedi@gmail.com', password: 'Sj6wK2sT7S', role: 'user', group: 'CNS', subGroup: '5' },
  { name: 'SUBHAN A. SYAWIE', email: 'subhan.a.syawie@gmail.com', password: 'Sb8xK2mP9A', role: 'user', group: 'CNS', subGroup: '-' },
  { name: 'TONI DWI TINDAK', email: 'toni.dwi.tindak@gmail.com', password: 'Td9wK6sP2A', role: 'user', group: 'ESS', subGroup: '4' },
  { name: 'TUNAS TIO MADA', email: 'tunas.tio.mada@gmail.com', password: 'Tt7pL3tW8V', role: 'user', group: 'ESS', subGroup: '2' },
  { name: 'UMMU N. FATHI', email: 'ummu.n.fathi@gmail.com', password: 'Un4vT8qR2U', role: 'user', group: 'ESS', subGroup: '1' },
  { name: 'WISNU HARI BIMANYU', email: 'wisnu.hari.bimanyu@gmail.com', password: 'Wh3vR7qL9Y', role: 'user', group: 'ESS', subGroup: '3' },
];
