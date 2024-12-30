'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentDateTime, formatDateTime } from '../../utils/timeUtils'
import { Download } from 'lucide-react'
import { saveAccount } from '../../lib/kv'

const hideNumberInputSpinButton = "appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

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
  amount: string;
  account?: string;
  fromAccount?: string;
  toAccount?: string;
}

interface AccountBalanceFormProps {
  initialAccounts: Account[];
  onUpdateAccount: (updatedAccount: Account) => void;
  transactions: Transaction[];
}

export default function AccountBalanceForm({ initialAccounts, onUpdateAccount, transactions }: AccountBalanceFormProps) {
  console.log('AccountBalanceForm received accounts:', initialAccounts);
  const [localAccounts, setLocalAccounts] = useState<Account[]>(initialAccounts || []);
  const [tempBalances, setTempBalances] = useState<{ [key: string]: string }>({});
  const [totals, setTotals] = useState({
    balance: 0,
    inputIncome: 0,
    inputExpense: 0,
    balanceBasedExpense: 0
  });

  useEffect(() => {
    console.log('Setting local accounts:', initialAccounts);
    setLocalAccounts(initialAccounts || []);
  }, [initialAccounts]);

  useEffect(() => {
    calculateTotals();
  }, [localAccounts]);

  const calculateTotals = () => {
    if (!localAccounts || localAccounts.length === 0) {
      setTotals({
        balance: 0,
        inputIncome: 0,
        inputExpense: 0,
        balanceBasedExpense: 0
      });
      return;
    }

    const newTotals = localAccounts.reduce((acc, account) => {
      acc.balance += account.balance;
      if (account.updates && account.updates.length > 0) {
        const latestUpdate = account.updates[0];
        acc.inputIncome += latestUpdate.inputIncome;
        acc.inputExpense += latestUpdate.inputExpense;
        acc.balanceBasedExpense += latestUpdate.balanceBasedExpense;
      }
      return acc;
    }, {
      balance: 0,
      inputIncome: 0,
      inputExpense: 0,
      balanceBasedExpense: 0
    });

    setTotals(newTotals);
  };

  const calculateInputs = (account: Account, startDate: Date, endDate: Date, previousBalance: number) => {
    const relevantTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.dateTime);
      return (t.account === account.name || t.toAccount === account.name || t.fromAccount === account.name) &&
        transactionDate > startDate &&
        transactionDate <= endDate;
    });

    const totalIncome = relevantTransactions.reduce((sum, t) => {
      if (t.type === 'income' || (t.type === 'transfer' && t.toAccount === account.name)) {
        return sum + parseFloat(t.amount);
      }
      return sum;
    }, 0);

    const totalExpense = relevantTransactions.reduce((sum, t) => {
      if (t.type === 'expense' || (t.type === 'transfer' && t.fromAccount === account.name)) {
        return sum + parseFloat(t.amount);
      }
      return sum;
    }, 0);

    const balanceBasedExpense = previousBalance + totalIncome - account.balance;

    return { inputIncome: totalIncome, inputExpense: totalExpense, balanceBasedExpense };
  };

  const handleUpdateBalance = async (index: number, newBalance: string) => {
    const parsedBalance = parseFloat(newBalance);
    if (!isNaN(parsedBalance)) {
      const updatedAccounts = localAccounts.map((account, i) => {
        if (i === index) {
          const currentDate = getCurrentDateTime();
          const lastUpdate = account.updates && account.updates.length > 0 
            ? account.updates[0] 
            : { date: new Date(0), balance: account.balance, inputIncome: 0, inputExpense: 0, balanceBasedExpense: 0 };
          const lastUpdateDate = new Date(lastUpdate.date);
          const { inputIncome, inputExpense, balanceBasedExpense } = calculateInputs(
            { ...account, balance: parsedBalance },
            lastUpdateDate,
            new Date(currentDate),
            lastUpdate.balance
          );
           
          const newUpdate: AccountUpdate = {
            date: new Date(currentDate),
            balance: parsedBalance,
            inputIncome: inputIncome,
            inputExpense: inputExpense,
            balanceBasedExpense: balanceBasedExpense,
          };
           
          const updatedAccount = {
            ...account,
            balance: parsedBalance,
            updates: [newUpdate, ...(account.updates || [])]
          };
          saveAccount(updatedAccount);
          return updatedAccount;
        }
        return account;
      });
      
      setLocalAccounts(updatedAccounts);
      onUpdateAccount(updatedAccounts[index]);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      "Account Name,Account Type,Current Balance,Date,Balance,Input Income,Input Expense,Balance-based Expense"
    ];

    localAccounts.forEach(account => {
      csvContent.push(
        `"${account.name}","${account.type}",${account.balance},${formatDateTime(new Date())},${account.balance},0,0,0`
      );
      if (account.updates) {
        account.updates.forEach(update => {
          csvContent.push(
            `"${account.name}","${account.type}",${account.balance},${formatDateTime(update.date)},${update.balance},${update.inputIncome},${update.inputExpense},${update.balanceBasedExpense}`
          );
        });
      }
    });

    csvContent.push(
      `"TOTAL",,${totals.balance},${formatDateTime(new Date())},${totals.balance},${totals.inputIncome},${totals.inputExpense},${totals.balanceBasedExpense}`
    );

    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "account_data.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  const handleNumberInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-black">Existing Accounts</h3>
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export Account Data
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Account Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold">Total Balance:</p>
              <p className="text-2xl">₹{totals.balance.toFixed(2)}</p>
            </div>
            <div>
              <p className="font-semibold">Total Input Income:</p>
              <p className="text-2xl text-green-600">₹{totals.inputIncome.toFixed(2)}</p>
            </div>
            <div>
              <p className="font-semibold">Total Input Expense:</p>
              <p className="text-2xl text-red-600">₹{totals.inputExpense.toFixed(2)}</p>
            </div>
            <div>
              <p className="font-semibold">Total Balance-based Expense:</p>
              <p className="text-2xl text-orange-600">₹{totals.balanceBasedExpense.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {localAccounts && localAccounts.length > 0 ? (
          localAccounts.map((account, index) => (
            <Card key={account.name} className="mb-4">
              <CardHeader>
                <CardTitle>{account.name} ({account.type})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <span className="flex-grow">Current Balance:</span>
                  <Input
                    type="number"
                    value={tempBalances[account.name] ?? account.balance.toString()}
                    onChange={(e) => setTempBalances(prev => ({ ...prev, [account.name]: e.target.value }))}
                    onKeyDown={(e) => {
                      handleNumberInputKeyDown(e);
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateBalance(index, tempBalances[account.name] ?? account.balance.toString());
                        setTempBalances(prev => ({ ...prev, [account.name]: undefined }));
                      }
                    }}
                    className={`w-32 ${hideNumberInputSpinButton}`}
                  />
                  <span>₹</span>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Last Balance Update:</h4>
                  {account.updates && account.updates.length > 0 ? (
                    <div className="text-sm">
                      <p>Date: {formatDateTime(account.updates[0].date)}</p>
                      <p>Balance: ₹{account.updates[0].balance.toFixed(2)}</p>
                      <p>Input Income: ₹{account.updates[0].inputIncome.toFixed(2)}</p>
                      <p>Input Expense: ₹{account.updates[0].inputExpense.toFixed(2)}</p>
                      <p>Balance-based Expense: ₹{account.updates[0].balanceBasedExpense.toFixed(2)}</p>
                    </div>
                  ) : (
                    <p>No updates available.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p>No accounts available. Add an account to get started.</p>
        )}
      </div>
    </div>
  )
}

