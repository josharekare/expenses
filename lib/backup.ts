import { kv } from '@vercel/kv';

const isVercelKVAvailable = typeof kv !== 'undefined' && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

export async function backupData() {
  let data;
  
  if (isVercelKVAvailable) {
    try {
      const keys = await kv.keys('*');
      data = await Promise.all(keys.map(async (key) => {
        const value = await kv.get(key);
        return { key, value };
      }));
    } catch (error) {
      console.error('Error accessing Vercel KV:', error);
      data = getLocalStorageData();
    }
  } else {
    data = getLocalStorageData();
  }

  const backupObject = {
    timestamp: new Date().toISOString(),
    data
  };

  console.log('Backup created:', JSON.stringify(backupObject));

  // In a real application, you might want to:
  // 1. Send this data to a secure cloud storage (e.g., AWS S3)
  // 2. Save it to a file on a server
  // 3. Send it via email to the admin
}

function getLocalStorageData() {
  if (typeof window !== 'undefined') {
    return Object.entries(localStorage).map(([key, value]) => ({
      key,
      value: JSON.parse(value)
    }));
  }
  return [];
}

