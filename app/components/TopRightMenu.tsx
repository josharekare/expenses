'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Menu } from 'lucide-react'
import Link from 'next/link'

type AccountType = 'Savings Bank Account' | 'Credit Card' | 'Loan and Misc' | 'Current Account'

interface Account {
  name: string
  type: AccountType
  balance: number
}

interface TopRightMenuProps {
  onAddAccount: (account: Account) => void
}

export function TopRightMenu({ onAddAccount }: TopRightMenuProps) {
  const [newAccount, setNewAccount] = useState<Account>({
    name: '',
    type: 'Savings Bank Account',
    balance: 0,
  })
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAddAccount(newAccount)
    setNewAccount({ name: '', type: 'Savings Bank Account', balance: 0 })
    setIsAddAccountOpen(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewAccount(prev => ({ ...prev, [name]: name === 'balance' ? parseFloat(value) : value }))
  }

  const handleSelectChange = (value: AccountType) => {
    setNewAccount(prev => ({ ...prev, type: value }))
  }

  return (
    <div className="flex items-center space-x-2">
      <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>Enter the details for the new account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                name="name"
                value={newAccount.name}
                onChange={handleChange}
                placeholder="Enter account name"
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Account Type</Label>
              <Select name="type" onValueChange={handleSelectChange} value={newAccount.type}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Savings Bank Account">Savings Bank Account</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Loan and Misc">Loan and Misc</SelectItem>
                  <SelectItem value="Current Account">Current Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="balance">Initial Balance (₹)</Label>
              <Input
                id="balance"
                name="balance"
                type="number"
                value={newAccount.balance}
                onChange={handleChange}
                placeholder="Enter initial balance"
                required
              />
            </div>
            <Button type="submit">Add Account</Button>
          </form>
        </DialogContent>
      </Dialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Menu className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Menu</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsAddAccountOpen(true)}>
            Add New Account
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/manage-tags">Manage Tags</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

