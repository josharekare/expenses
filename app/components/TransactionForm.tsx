'use client'

import { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, ChevronLeft, ChevronRight, Download, Pencil, Trash2, X } from 'lucide-react'
import { format, addYears, subYears } from "date-fns"
import { getCurrentDateTime, formatDateTime, formatDateTimeForInput, convertToUTC } from '../../utils/timeUtils'

type TransactionType = 'expense' | 'income' | 'transfer'
type AccountType = 'Savings Bank Account' | 'Credit Card' | 'Loan and Misc' | 'Current Account'

interface Account {
  name: string
  type: AccountType
  balance: number
}

interface Transaction {
  id: string
  type: TransactionType
  dateTime: string
  tags: string[]
  amount: string
  description: string
  account?: string
  fromAccount?: string
  toAccount?: string
}

interface TagData {
  name: string
  count: number
}

interface TransactionFormProps {
  accounts: Account[]
  allTags: TagData[]
  onAddTransaction: (transaction: Transaction) => void
  onUpdateTags: (updatedTags: TagData[]) => void
  transactions: Transaction[]
  onDeleteTransaction: (id: string) => void
}

export default function TransactionForm({ accounts, allTags, onAddTransaction, onUpdateTags, transactions, onDeleteTransaction }: TransactionFormProps) {
  const [transaction, setTransaction] = useState<Transaction>({
    id: '',
    type: 'expense',
    dateTime: getCurrentDateTime(),
    tags: [],
    amount: '',
    description: '',
    account: '',
    fromAccount: '',
    toAccount: '',
  })
  const [tagInput, setTagInput] = useState('')
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const now = new Date(getCurrentDateTime())
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    return { from: startOfDay, to: endOfDay }
  })
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const dateTimeRef = useRef<HTMLInputElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const accountRef = useRef<HTMLButtonElement>(null)
  const fromAccountRef = useRef<HTMLButtonElement>(null)
  const toAccountRef = useRef<HTMLButtonElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (tagInput) {
      const sortedTags = [...allTags]
        .sort((a, b) => b.count - a.count)
        .filter(tag => 
          tag.name.toLowerCase().includes(tagInput.toLowerCase()) && 
          !transaction.tags.includes(tag.name)
        )
        .map(tag => tag.name)
        .slice(0, 6)

      setSuggestedTags(sortedTags)
    } else {
      setSuggestedTags([])
    }
  }, [tagInput, transaction.tags, allTags])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newTransaction = { 
      ...transaction, 
      id: editingTransaction ? editingTransaction.id : Date.now().toString(),
      amount: parseFloat(transaction.amount).toString(),
      dateTime: getCurrentDateTime()
    }
    
    // Save new tags
    const newTags = transaction.tags.filter(tag => !allTags.some(t => t.name === tag))
    if (newTags.length > 0) {
      const updatedAllTags = [
        ...allTags,
        ...newTags.map(tag => ({ name: tag, count: 1 }))
      ]
      onUpdateTags(updatedAllTags)
    }

    onAddTransaction(newTransaction)
    setEditingTransaction(null)

    // Reset form
    setTransaction({
      id: '',
      type: 'expense',
      dateTime: getCurrentDateTime(),
      tags: [],
      amount: '',
      description: '',
      account: '',
      fromAccount: '',
      toAccount: '',
    })
    setTagInput('')
    dateTimeRef.current?.focus()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setTransaction(prev => ({ ...prev, [name]: value }))
  }

  const handleTypeChange = (type: TransactionType) => {
    setTransaction(prev => ({ ...prev, type }))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, nextRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>) => {
    if (e.key === 'Enter' && e.currentTarget.tagName !== 'TEXTAREA') {
      e.preventDefault()
      nextRef.current?.focus()
    }
  }

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value)
  }

  const handleTagInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput) {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  const addTag = (tag: string) => {
    if (tag && !transaction.tags.includes(tag)) {
      setTransaction(prev => ({ ...prev, tags: [...prev.tags, tag] }))
      if (!allTags.some(t => t.name === tag)) {
        onUpdateTags([...allTags, { name: tag, count: 0 }])
      }
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTransaction(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t)
    setTransaction({
      ...t,
      dateTime: formatDateTimeForInput(t.dateTime),
    })
  }

  const handleDelete = (id: string) => {
    onDeleteTransaction(id)
  }

  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.dateTime)
    const startOfDay = new Date(dateRange.from)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(dateRange.to)
    endOfDay.setHours(23, 59, 59, 999)
    const isInDateRange = transactionDate >= startOfDay && transactionDate <= endOfDay
    const matchesTag = selectedTag === 'all' || t.tags.includes(selectedTag)
    return isInDateRange && matchesTag
  })

  const exportToCSV = () => {
    const csvContent = [
      "ID,Type,Date,Tags,Amount,Description,Account,From Account,To Account"
    ];

    filteredTransactions.forEach(t => {
      csvContent.push(
        `"${t.id}","${t.type}","${t.dateTime}","${t.tags.join(';')}","${t.amount}","${t.description}","${t.account || ''}","${t.fromAccount || ''}","${t.toAccount || ''}"`
      );
    });

    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "transaction_history.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex space-x-2">
          {(['expense', 'income', 'transfer'] as TransactionType[]).map((type) => (
            <Button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              variant={transaction.type === type ? 'default' : 'outline'}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>

        <div>
          <Label htmlFor="dateTime">Date and Time</Label>
          <Input
            type="datetime-local"
            id="dateTime"
            name="dateTime"
            value={formatDateTimeForInput(transaction.dateTime)}
            onChange={handleChange}
            onKeyDown={(e) => handleKeyDown(e, tagInputRef)}
            required
            ref={dateTimeRef}
          />
        </div>

        <div>
          <Label htmlFor="tags">Tags</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {transaction.tags.map(tag => (
              <span key={tag} className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-sm flex items-center">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-primary-foreground hover:text-accent-foreground">
                  <X className="h-4 w-4" />
                </button>
              </span>
            ))}
          </div>
          <div className="relative">
            <Input
              type="text"
              id="tags"
              value={tagInput}
              onChange={handleTagInputChange}
              onKeyDown={handleTagInputKeyDown}
              placeholder="Add tags"
              ref={tagInputRef}
            />
            {suggestedTags.length > 0 && (
              <div className="absolute z-10 w-full bg-background border border-input rounded-md mt-1">
                {suggestedTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className="w-full text-left px-2 py-1 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => addTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="amount">Amount (₹)</Label>
          <Input
            type="number"
            id="amount"
            name="amount"
            value={transaction.amount.toString()}
            onChange={(e) => setTransaction(prev => ({ ...prev, amount: e.target.value }))}
            onKeyDown={(e) => handleKeyDown(e, descriptionRef)}
            placeholder="Amount in ₹"
            required
            ref={amountRef}
          />
        </div>

        {transaction.type !== 'transfer' && (
          <div>
            <Label htmlFor="account">Account</Label>
            <Select name="account" onValueChange={(value) => setTransaction(prev => ({ ...prev, account: value }))} value={transaction.account}>
              <SelectTrigger ref={accountRef}>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.name} value={account.name}>
                    {account.name} ({account.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {transaction.type === 'transfer' && (
          <>
            <div>
              <Label htmlFor="fromAccount">From Account</Label>
              <Select name="fromAccount" onValueChange={(value) => setTransaction(prev => ({ ...prev, fromAccount: value }))} value={transaction.fromAccount}>
                <SelectTrigger ref={fromAccountRef}>
                  <SelectValue placeholder="Select from account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.name} value={account.name}>
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="toAccount">To Account</Label>
              <Select name="toAccount" onValueChange={(value) => setTransaction(prev => ({ ...prev, toAccount: value }))} value={transaction.toAccount}>
                <SelectTrigger ref={toAccountRef}>
                  <SelectValue placeholder="Select to account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.name} value={account.name}>
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            value={transaction.description}
            onChange={handleChange}
            onKeyDown={(e) => handleKeyDown(e, submitRef)}
            placeholder="Enter description"
            required
            ref={descriptionRef}
          />
        </div>

        <div className="flex space-x-2">
          <Button type="submit" ref={submitRef}>
            {editingTransaction ? 'Update Transaction' : 'Add Transaction'}
          </Button>
          {editingTransaction && (
            <Button type="button" variant="outline" onClick={() => {
              setEditingTransaction(null)
              setTransaction({
                id: '',
                type: 'expense',
                dateTime: getCurrentDateTime(),
                tags: [],
                amount: '',
                description: '',
                account: '',
                fromAccount: '',
                toAccount: '',
              })
            }}
          >
            Cancel Edit
          </Button>
        )}
      </div>
    </form>

    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <div className="flex justify-between items-center mt-4">
          <div className="space-y-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[300px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex items-center justify-between px-3 pt-3">
                  <Button
                    variant="outline"
                    className="h-7 w-7 p-0"
                    onClick={() => setCalendarDate(subYears(calendarDate, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Select
                    value={calendarDate.getFullYear().toString()}
                    onValueChange={(year) => setCalendarDate(new Date(parseInt(year, 10), calendarDate.getMonth()))}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue>{calendarDate.getFullYear()}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 11 }, (_, i) => calendarDate.getFullYear() - 5 + i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="h-7 w-7 p-0"
                    onClick={() => setCalendarDate(addYears(calendarDate, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    if (range?.from) {
                      const from = new Date(range.from)
                      from.setHours(0, 0, 0, 0)
                      const to = range.to ? new Date(range.to) : new Date(from)
                      to.setHours(23, 59, 59, 999)
                      setDateRange({ from, to })
                    } else {
                      setDateRange({ from: new Date(getCurrentDateTime()), to: new Date(getCurrentDateTime()) })
                    }
                  }}
                  month={calendarDate}
                  onMonthChange={setCalendarDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger>
                <SelectValue placeholder="Select tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag.name} value={tag.name}>{tag.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {filteredTransactions.map((t) => (
            <div key={t.id} className="mb-4 pb-4 border-b last:border-b-0">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{t.type.charAt(0).toUpperCase() + t.type.slice(1)}</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(t.dateTime)}
                  </p>
                </div>
                <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{t.amount}
                </span>
              </div>
              <p className="mt-1">{t.description}</p>
              {t.type !== 'transfer' && <p className="text-sm">Account: {t.account}</p>}
              {t.type === 'transfer' && (
                <p className="text-sm">From: {t.fromAccount} To: {t.toAccount}</p>
              )}
              {t.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {t.tags.map(tag => (
                    <span key={tag} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex justify-end mt-2 space-x-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  </div>
)
}

