'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, ArrowUpDown } from 'lucide-react'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface TagData {
  name: string;
  createdAt: string;
  transactionCount: number;
  totalAmount: number;
  lastUsed?: string;
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

const preloadedTags = ['trip', 'train', 'petrol', 'house']

type SortOption = 'lexical' | 'time' | 'transactionCount' | 'totalAmount' | 'recentlyUsed';

export default function ManageTags() {
  const [tags, setTags] = useState<TagData[]>([])
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('lexical')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; tagToDelete: string | null }>({
    isOpen: false,
    tagToDelete: null,
  })

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = () => {
    const storedTags = localStorage.getItem('tags')
    let tagsToSet: TagData[] = []
    if (storedTags) {
      try {
        tagsToSet = JSON.parse(storedTags)
      } catch (error) {
        console.error('Error parsing stored tags:', error)
      }
    }

    // Ensure all preloaded tags are present
    const updatedTags = preloadedTags.reduce((acc, tagName) => {
      if (!acc.some(tag => tag.name === tagName)) {
        acc.push({
          name: tagName,
          createdAt: new Date().toISOString(),
          transactionCount: 0,
          totalAmount: 0,
          lastUsed: new Date(0).toISOString()
        })
      }
      return acc
    }, tagsToSet)

    setTags(updatedTags)
    localStorage.setItem('tags', JSON.stringify(updatedTags))
  }

  useEffect(() => {
    if (tags.length > 0) {
      const sortedTags = sortTags(sortOption, sortDirection)
      setTags(sortedTags)
    }
  }, [sortOption, sortDirection])

  const sortTags = (option: SortOption, direction: 'asc' | 'desc') => {
    return [...tags].sort((a, b) => {
      let comparison = 0
      switch (option) {
        case 'lexical':
          comparison = a.name.localeCompare(b.name)
          break
        case 'time':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          break
        case 'transactionCount':
          comparison = b.transactionCount - a.transactionCount
          break
        case 'totalAmount':
          comparison = b.totalAmount - a.totalAmount
          break
        case 'recentlyUsed':
          comparison = new Date(b.lastUsed || 0).getTime() - new Date(a.lastUsed || 0).getTime()
          break
      }
      return direction === 'asc' ? comparison : -comparison
    })
  }

  const handleSortChange = (newSortOption: SortOption) => {
    setSortOption(newSortOption)
  }

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const saveTags = (updatedTags: TagData[]) => {
    const uniqueTags = updatedTags.filter((tag, index, self) =>
      index === self.findIndex((t) => t.name === tag.name)
    )
    
    // Ensure preloaded tags are always present
    const tagsWithPreloaded = preloadedTags.reduce((acc, tagName) => {
      if (!acc.some(tag => tag.name === tagName)) {
        acc.push({
          name: tagName,
          createdAt: new Date().toISOString(),
          transactionCount: 0,
          totalAmount: 0,
          lastUsed: new Date(0).toISOString()
        })
      }
      return acc
    }, uniqueTags)

    setTags(tagsWithPreloaded)
    localStorage.setItem('tags', JSON.stringify(tagsWithPreloaded))
  }

  const updateTransactionsAfterTagDelete = (deletedTag: string) => {
    const storedTransactions = localStorage.getItem('transactions')
    if (storedTransactions) {
      const transactions: Transaction[] = JSON.parse(storedTransactions)
      const updatedTransactions = transactions.map(transaction => ({
        ...transaction,
        tags: transaction.tags.filter(tag => tag !== deletedTag)
      }))
      localStorage.setItem('transactions', JSON.stringify(updatedTransactions))
    }
  }

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTag && !tags.some(tag => tag.name === newTag)) {
      const newTagData: TagData = {
        name: newTag,
        createdAt: new Date().toISOString(),
        transactionCount: 0,
        totalAmount: 0,
        lastUsed: new Date().toISOString()
      }
      const updatedTags = [...tags, newTagData]
      saveTags(updatedTags)
      setNewTag('')
    }
  }

  const handleDeleteTag = (tagToDelete: string) => {
    if (preloadedTags.includes(tagToDelete)) {
      alert("Preloaded tags cannot be deleted.")
      return
    }
    setDeleteConfirmation({ isOpen: true, tagToDelete })
  }

  const confirmDeleteTag = () => {
    if (deleteConfirmation.tagToDelete) {
      const updatedTags = tags.filter(tag => tag.name !== deleteConfirmation.tagToDelete)
      saveTags(updatedTags)
      updateTransactionsAfterTagDelete(deleteConfirmation.tagToDelete)
    }
    setDeleteConfirmation({ isOpen: false, tagToDelete: null })
  }

  const handleEditTag = (oldTagName: string, newTagName: string) => {
    if (preloadedTags.includes(oldTagName)) {
      alert("Preloaded tags cannot be edited.")
      return
    }
    if (newTagName && newTagName !== oldTagName) {
      const updatedTags = tags.map(tag => 
        tag.name === oldTagName ? { ...tag, name: newTagName } : tag
      )
      saveTags(updatedTags)
      
      // Update tag name in transactions
      const storedTransactions = localStorage.getItem('transactions')
      if (storedTransactions) {
        const transactions: Transaction[] = JSON.parse(storedTransactions)
        const updatedTransactions = transactions.map(transaction => ({
          ...transaction,
          tags: transaction.tags.map(tag => tag === oldTagName ? newTagName : tag)
        }))
        localStorage.setItem('transactions', JSON.stringify(updatedTransactions))
      }
    }
    setEditingTag(null)
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Tags</h1>
        <Link href="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
      <div className="space-y-4">
        <form onSubmit={handleAddTag} className="flex gap-2">
          <Input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add new tag"
            className="flex-grow"
          />
          <Button type="submit">Add Tag</Button>
        </form>
        <div className="flex justify-end items-center space-x-2">
          <Select 
            value={sortOption} 
            onValueChange={(value) => handleSortChange(value as SortOption)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lexical">Alphabetical</SelectItem>
              <SelectItem value="time">Creation Time</SelectItem>
              <SelectItem value="transactionCount">Transaction Count</SelectItem>
              <SelectItem value="totalAmount">Total Amount</SelectItem>
              <SelectItem value="recentlyUsed">Recently Used</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSortDirection}
            title={sortDirection === 'asc' ? "Sort Ascending" : "Sort Descending"}
          >
            <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tags.map((tag, index) => (
            <div key={`${tag.name}-${index}`} className="bg-secondary rounded-md p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                {editingTag === tag.name ? (
                  <Input
                    value={tag.name}
                    onChange={(e) => {
                      const updatedTags = tags.map(t => 
                        t.name === tag.name ? { ...t, name: e.target.value } : t
                      )
                      setTags(updatedTags)
                    }}
                    onBlur={() => handleEditTag(tag.name, tag.name)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleEditTag(tag.name, tag.name)
                      }
                    }}
                    className="w-full"
                    autoFocus
                  />
                ) : (
                  <span 
                    onClick={() => setEditingTag(tag.name)} 
                    className="cursor-pointer font-semibold text-lg truncate"
                  >
                    {tag.name}
                  </span>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDeleteTag(tag.name)} 
                  className="ml-2"
                  disabled={preloadedTags.includes(tag.name)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Created: {new Date(tag.createdAt).toLocaleString()}</p>
                <p>Transactions: {tag.transactionCount}</p>
                <p>Total Amount: ₹{tag.totalAmount.toFixed(2)}</p>
                {tag.lastUsed && <p>Last Used: {new Date(tag.lastUsed).toLocaleString()}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => setDeleteConfirmation({ isOpen, tagToDelete: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the tag and remove it from all associated transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTag}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

