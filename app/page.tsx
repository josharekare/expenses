'use client'

import { useState, useEffect } from 'react'
import { TopRightMenu } from './components/TopRightMenu'
import TransactionForm from './components/TransactionForm'
import AccountBalanceForm from './components/AccountBalanceForm'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { getCurrentDateTime } from '../utils/timeUtils'
import { clearCache } from '../lib/kv'
import { backupData } from '../lib/backup'

type AccountType = 'Savings Bank Account' | 'Credit Card' | 'Loan and Misc' | 'Current Account'

interface AccountUpdate {
  date: Date;
  balance: number;
  inputIncome: number;
  inputExpense: number;
  balanceBasedExpense: number;
}

interface Account {
  name: string;
  type: AccountType;
  balance: number;
  updates: AccountUpdate[];
}

interface Transaction {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  dateTime: string;
  tags: string[];
  amount: string;
  description: string;
  account?: string;
  fromAccount?: string;
  toAccount?: string;
}

interface TagData {
  name: string;
  createdAt: string;
  transactionCount: number;
  totalAmount: number;
  lastUsed?: string;
}

const defaultAccounts: Account[] = [
  { name: 'Axis Bank', type: 'Savings Bank Account', balance: 15000, updates: [] },
  { name: 'ICICI Credit Card', type: 'Credit Card', balance: -4000, updates: [] },
  { name: 'HDFC Bank', type: 'Current Account', balance: 25000, updates: [] },
]

const preloadedTags = ['trip', 'train', 'petrol', 'house']

const preloadedTransactions: Transaction[] = [
  {
    id: '1',
    type: 'expense',
    dateTime: getCurrentDateTime(),
    tags: ['trip', 'petrol'],
    amount: '2000',
    description: 'Road trip fuel expenses',
    account: 'Axis Bank'
  },
  {
    id: '2',
    type: 'expense',
    dateTime: getCurrentDateTime(),
    tags: ['train'],
    amount: '1500',
    description: 'Train tickets for weekend getaway',
    account: 'ICICI Credit Card'
  },
  {
    id: '3',
    type: 'expense',
    dateTime: getCurrentDateTime(),
    tags: ['house'],
    amount: '5000',
    description: 'Monthly rent payment',
    account: 'HDFC Bank'
  },
  {
    id: '4',
    type: 'income',
    dateTime: getCurrentDateTime(),
    tags: ['house'],
    amount: '50000',
    description: 'Monthly salary',
    account: 'Axis Bank'
  }
]

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [allTags, setAllTags] = useState<TagData[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; transactionToDelete: string | null }>({
    isOpen: false,
    transactionToDelete: null,
  })
  const [balanceUpdateConfirmation, setBalanceUpdateConfirmation] = useState<{ isOpen: boolean; accountToUpdate: Account | null }>({
    isOpen: false,
    accountToUpdate: null,
  })

  useEffect(() => {
    loadAccounts()
    loadTransactions()
    loadTags()
    console.log('Accounts loaded:', accounts)
  }, [])

  const loadAccounts = () => {
    const storedAccounts = localStorage.getItem('accounts')
    if (storedAccounts) {
      try {
        const parsedAccounts = JSON.parse(storedAccounts)
        setAccounts(parsedAccounts)
      } catch (error) {
        console.error('Error parsing stored accounts:', error)
        setAccounts(defaultAccounts)
      }
    } else {
      setAccounts(defaultAccounts)
      localStorage.setItem('accounts', JSON.stringify(defaultAccounts))
    }
  }

  const loadTransactions = () => {
    const storedTransactions = localStorage.getItem('transactions')
    if (storedTransactions) {
      try {
        const parsedTransactions = JSON.parse(storedTransactions)
        setTransactions(parsedTransactions)
      } catch (error) {
        console.error('Error parsing stored transactions:', error)
        setTransactions(preloadedTransactions)
      }
    } else {
      setTransactions(preloadedTransactions)
      localStorage.setItem('transactions', JSON.stringify(preloadedTransactions))
    }
  }

  const loadTags = () => {
    const storedTags = localStorage.getItem('tags')
    let initialTags: TagData[] = []
    if (storedTags) {
      try {
        initialTags = JSON.parse(storedTags)
      } catch (error) {
        console.error('Error parsing stored tags:', error)
      }
    }

    // Ensure all preloaded tags are present
    const updatedTags = preloadedTags.reduce((acc, tagName) => {
      if (!acc.some(tag => tag.name === tagName)) {
        acc.push({
          name: tagName,
          createdAt: getCurrentDateTime(),
          transactionCount: 0,
          totalAmount: 0,
          lastUsed: getCurrentDateTime()
        })
      }
      return acc
    }, initialTags)

    setAllTags(updatedTags)
    localStorage.setItem('tags', JSON.stringify(updatedTags))
  }

  useEffect(() => {
    updateTagData()
  }, [transactions])

  const updateTagData = () => {
    const tagData: Record<string, TagData> = {}

    // Initialize tagData with existing tags and preloaded tags
    allTags.forEach(tag => {
      tagData[tag.name] = { ...tag, transactionCount: 0, totalAmount: 0, lastUsed: undefined }
    })

    // Ensure preloaded tags are always present
    preloadedTags.forEach(tagName => {
      if (!tagData[tagName]) {
        tagData[tagName] = {
          name: tagName,
          createdAt: getCurrentDateTime(),
          transactionCount: 0,
          totalAmount: 0,
          lastUsed: undefined
        }
      }
    })

    transactions.forEach(transaction => {
      transaction.tags.forEach(tagName => {
        if (!tagData[tagName]) {
          tagData[tagName] = {
            name: tagName,
            createdAt: getCurrentDateTime(),
            transactionCount: 0,
            totalAmount: 0,
            lastUsed: undefined
          }
        }
        tagData[tagName].transactionCount++
        tagData[tagName].totalAmount += parseFloat(transaction.amount) * (transaction.type === 'income' ? 1 : -1)
        if (!tagData[tagName].lastUsed || new Date(transaction.dateTime) > new Date(tagData[tagName].lastUsed)) {
          tagData[tagName].lastUsed = transaction.dateTime
        }
      })
    })

    const updatedTags = Object.values(tagData)

    setAllTags(updatedTags)
    localStorage.setItem('tags', JSON.stringify(updatedTags))
  }

  const handleAddAccount = (newAccount: Account) => {
    setBalanceUpdateConfirmation({
      isOpen: true,
      accountToUpdate: newAccount,
    })
  }

  const confirmAddAccount = () => {
    if (balanceUpdateConfirmation.accountToUpdate) {
      setAccounts(prev => {
        const updatedAccounts = [...prev, balanceUpdateConfirmation.accountToUpdate]
        localStorage.setItem('accounts', JSON.stringify(updatedAccounts))
        return updatedAccounts
      })
    }
    setBalanceUpdateConfirmation({ isOpen: false, accountToUpdate: null })
  }

  const handleUpdateAccount = (updatedAccount: Account) => {
    setAccounts(prev => {
      const updatedAccounts = prev.map(account => 
        account.name === updatedAccount.name ? updatedAccount : account
      )
      localStorage.setItem('accounts', JSON.stringify(updatedAccounts))
      return updatedAccounts
    })
  }

  const handleAddTransaction = (newTransaction: Transaction) => {
    setTransactions(prev => {
      const updated = [newTransaction, ...prev]
      localStorage.setItem('transactions', JSON.stringify(updated))
      return updated
    })
  }

  const handleDeleteTransaction = (transactionId: string) => {
    setDeleteConfirmation({
      isOpen: true,
      transactionToDelete: transactionId,
    })
  }

  const confirmDeleteTransaction = () => {
    if (deleteConfirmation.transactionToDelete) {
      setTransactions(prev => {
        const updated = prev.filter(t => t.id !== deleteConfirmation.transactionToDelete)
        localStorage.setItem('transactions', JSON.stringify(updated))
        return updated
      })
    }
    setDeleteConfirmation({ isOpen: false, transactionToDelete: null })
  }

  const handleUpdateTags = (updatedTags: TagData[]) => {
    // Ensure preloaded tags are always present
    const tagsWithPreloaded = preloadedTags.reduce((acc, tagName) => {
      if (!acc.some(tag => tag.name === tagName)) {
        acc.push({
          name: tagName,
          createdAt: getCurrentDateTime(),
          transactionCount: 0,
          totalAmount: 0,
          lastUsed: getCurrentDateTime()
        })
      }
      return acc
    }, updatedTags)

    setAllTags(tagsWithPreloaded)
    localStorage.setItem('tags', JSON.stringify(tagsWithPreloaded))
  }

  useEffect(() => {
    // Clear the cache when the component unmounts
    return () => {
      clearCache();
    };
  }, []);

  useEffect(() => {
    // Perform a backup every hour
    const backupInterval = setInterval(() => {
      backupData().catch(error => {
        console.error('Backup failed:', error);
        // Implement appropriate error handling here, such as displaying an error message to the user
      });
    }, 3600000); // 1 hour in milliseconds

    return () => {
      clearInterval(backupInterval);
    };
  }, []);

  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Expense Management App</h1>
        <TopRightMenu onAddAccount={handleAddAccount} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Transactions</h2>
          <TransactionForm 
            accounts={accounts} 
            allTags={allTags}
            onAddTransaction={handleAddTransaction}
            onUpdateTags={handleUpdateTags}
            transactions={transactions}
            onDeleteTransaction={handleDeleteTransaction}
          />
        </section>
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Account Balances</h2>
          <AccountBalanceForm 
            initialAccounts={accounts}
            onUpdateAccount={handleUpdateAccount}
            transactions={transactions}
          />
        </section>
      </div>
      <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => setDeleteConfirmation({ isOpen, transactionToDelete: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTransaction}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={balanceUpdateConfirmation.isOpen} onOpenChange={(isOpen) => setBalanceUpdateConfirmation({ isOpen, accountToUpdate: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Account Addition</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to add this account with the specified balance?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAddAccount}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

