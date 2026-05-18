import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return json({ error: 'File tidak ditemukan.' }, { status: 400 });
    }

    if (!env.CLOUDINARY_URL) {
      console.error('CRITICAL: CLOUDINARY_URL tidak dikonfigurasi.');
      return json({ error: 'Cloudinary tidak dikonfigurasi.' }, { status: 500 });
    }

    // Parse CLOUDINARY_URL: cloudinary://<api_key>:<api_secret>@<cloud_name>
    const match = env.CLOUDINARY_URL.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
    if (!match) {
      console.error('CRITICAL: Format CLOUDINARY_URL tidak valid.');
      return json({ error: 'Konfigurasi Cloudinary salah.' }, { status: 500 });
    }

    let apiKey = match[1];
    let apiSecret = match[2];
    const cloudName = match[3];

    // Clean angle brackets if present in .env
    apiKey = apiKey.replace(/[<>]/g, '');
    apiSecret = apiSecret.replace(/[<>]/g, '');

    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = formData.get('folder') as string || 'penanaman';

    // Generate Cloudinary Signature
    const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

    // Prepare FormData for Cloudinary
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('api_key', apiKey);
    cloudinaryFormData.append('timestamp', String(timestamp));
    cloudinaryFormData.append('folder', folder);
    cloudinaryFormData.append('signature', signature);

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: cloudinaryFormData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cloudinary API Error:', errorData);
      return json({ error: errorData.error?.message || 'Gagal mengupload ke Cloudinary.' }, { status: 500 });
    }

    const data = await response.json();
    return json({ secure_url: data.secure_url });
  } catch (error: any) {
    const message = error?.message ?? String(error);
    console.error('Error in Cloudinary upload API:', message);
    return json({ error: message }, { status: 500 });
  }
};
