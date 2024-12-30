import { kv } from '@vercel/kv';

const isVercelKVAvailable = typeof kv !== 'undefined' && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

// Helper function to get data from localStorage
const getFromLocalStorage = (key: string) => {
  if (typeof window !== 'undefined') {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }
  return null;
};

// Helper function to set data in localStorage
const setInLocalStorage = (key: string, value: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export async function saveAccount(account: Account) {
  if (isVercelKVAvailable) {
    await kv.set(`account:${account.name}`, JSON.stringify(account));
  } else {
    const accounts = getFromLocalStorage('accounts') || [];
    const index = accounts.findIndex((a: Account) => a.name === account.name);
    if (index !== -1) {
      accounts[index] = account;
    } else {
      accounts.push(account);
    }
    setInLocalStorage('accounts', accounts);
  }
}

export async function getAccount(accountName: string): Promise<Account | null> {
  if (isVercelKVAvailable) {
    const accountData = await kv.get(`account:${accountName}`);
    return accountData ? JSON.parse(accountData as string) : null;
  } else {
    const accounts = getFromLocalStorage('accounts') || [];
    return accounts.find((a: Account) => a.name === accountName) || null;
  }
}

export async function getAllAccounts(): Promise<Account[]> {
  if (isVercelKVAvailable) {
    const keys = await kv.keys('account:*');
    const accounts = await Promise.all(keys.map(key => kv.get(key)));
    return accounts.map(account => JSON.parse(account as string));
  } else {
    return getFromLocalStorage('accounts') || [];
  }
}

export async function saveTransaction(transaction: Transaction) {
  if (isVercelKVAvailable) {
    await kv.set(`transaction:${transaction.id}`, JSON.stringify(transaction));
  } else {
    const transactions = getFromLocalStorage('transactions') || [];
    transactions.push(transaction);
    setInLocalStorage('transactions', transactions);
  }
}

export async function getAllTransactions(): Promise<Transaction[]> {
  if (isVercelKVAvailable) {
    const keys = await kv.keys('transaction:*');
    const transactions = await Promise.all(keys.map(key => kv.get(key)));
    return transactions.map(transaction => JSON.parse(transaction as string));
  } else {
    return getFromLocalStorage('transactions') || [];
  }
}

export async function saveTags(tags: TagData[]) {
  if (isVercelKVAvailable) {
    await kv.set('tags', JSON.stringify(tags));
  } else {
    setInLocalStorage('tags', tags);
  }
}

export async function getAllTags(): Promise<TagData[]> {
  if (isVercelKVAvailable) {
    const tags = await kv.get('tags');
    return tags ? JSON.parse(tags as string) : [];
  } else {
    return getFromLocalStorage('tags') || [];
  }
}

async function clearCache() {
  if (isVercelKVAvailable) {
    await kv.clear();
  } else {
    localStorage.clear();
  }
}

export { clearCache };

