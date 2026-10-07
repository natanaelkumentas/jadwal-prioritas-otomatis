import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const srcPath = path.join(process.cwd(), 'af19c6d05e860eea36d72dbb71bd915b~tplv-tiktokx-cropcenter_168_168.jpeg');
    
    // Copy to public/favicon.jpeg
    const publicJpeg = path.join(process.cwd(), 'public', 'favicon.jpeg');
    fs.copyFileSync(srcPath, publicJpeg);

    // Copy to public/favicon.ico
    const publicIco = path.join(process.cwd(), 'public', 'favicon.ico');
    fs.copyFileSync(srcPath, publicIco);

    // Copy to src/app/icon.jpeg (Next.js 14 App Router automatic icon)
    const appIcon = path.join(process.cwd(), 'src', 'app', 'icon.jpeg');
    fs.copyFileSync(srcPath, appIcon);

    // Also overwrite src/app/favicon.ico if exists
    const appIco = path.join(process.cwd(), 'src', 'app', 'favicon.ico');
    fs.copyFileSync(srcPath, appIco);

    return NextResponse.json({ success: true, message: 'Favicon copied to public and src/app' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
