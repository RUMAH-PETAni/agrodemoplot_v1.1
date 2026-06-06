import ee from '@google/earthengine';
import { env } from '$env/dynamic/private';

/**
 * Inisialisasi koneksi server ke Google Earth Engine.
 * Memerlukan Service Account JSON credentials.
 */
export async function initializeGee() {
  return new Promise((resolve, reject) => {
    // Jika GEE sudah diinisialisasi sebelumnya, tidak perlu login ulang
    if (ee.data.getAuthToken()) {
      return resolve(true);
    }

    try {
      // Mengambil credentials dari environment variables (atau menggunakan default lokal untuk pengembangan)
      // Dalam produksi, simpan kunci privat di Vercel/Supabase Edge environment variables.
      const privateKey = env.EE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = env.EE_CLIENT_EMAIL;

      if (!privateKey || !clientEmail) {
        console.warn('⚠️ Kredensial Earth Engine (EE_PRIVATE_KEY/EE_CLIENT_EMAIL) tidak ditemukan di .env.');
        console.warn('Menggunakan mode development fallback jika ada, atau pastikan .env sudah dikonfigurasi.');
        
        // Coba autentikasi default (hanya untuk testing lokal jika sudah ada credentials lokal)
        ee.initialize(
            null, 
            null, 
            () => resolve(true),
            (err) => {
                console.error("Gagal inisialisasi GEE:", err);
                reject(err);
            }
        );
        return;
      }

      // Autentikasi menggunakan Service Account
      ee.data.authenticateViaPrivateKey(
        {
          client_email: clientEmail,
          private_key: privateKey
        },
        () => {
          console.log('✅ Autentikasi GEE berhasil dengan Service Account.');
          ee.initialize(
            null,
            null,
            () => {
              console.log('✅ Earth Engine berhasil diinisialisasi.');
              resolve(true);
            },
            (err) => {
              console.error('❌ Gagal inisialisasi Earth Engine:', err);
              reject(err);
            }
          );
        },
        (err) => {
          console.error('❌ Gagal autentikasi Service Account GEE:', err);
          reject(err);
        }
      );
    } catch (err) {
      console.error('Error saat inisialisasi GEE:', err);
      reject(err);
    }
  });
}
