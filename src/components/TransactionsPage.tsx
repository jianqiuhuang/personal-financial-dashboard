"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { FunnelIcon } from "@heroicons/react/24/solid";

interface Transaction {
  id: string;
  date: string;
  name: string;
  amount: number;
  accountName?: string;
  personalFinanceCategory?: string;
  merchant?: string;
  paymentChannel?: string;
}

const categoryOptions = [
  "Restaurant",
  "Grocery",
  "Toll",
  "Gas",
  "Miscellaneous",
  "Gift",
  "Vacation",
  "Bill",
  "Mortgage",
].sort();

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [account, setAccount] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [merchant, setMerchant] = useState("");
  const [merchantFilter, setMerchantFilter] = useState<string[]>([]);
  const [accountFilter, setAccountFilter] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [merchants, setMerchants] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [dateFilter, setDateFilter] = useState("all");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [merchantDropdownOpen, setMerchantDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownRefs = {
    category: useRef<HTMLDivElement>(null),
    account: useRef<HTMLDivElement>(null),
    merchant: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    async function fetchTransactions() {
      const res = await fetch("/api/accounts/transactions");
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
      setLoading(false);
    }
    fetchTransactions();
  }, []);

  useEffect(() => {
    setAccounts(Array.from(new Set(transactions.map((tx: Transaction) => tx.accountName).filter(Boolean))) as string[]);
    setCategories(Array.from(new Set(transactions.map((tx: Transaction) => tx.personalFinanceCategory).filter(Boolean))) as string[]);
    setMerchants(Array.from(new Set(transactions.map((tx: Transaction) => tx.merchant).filter(Boolean))) as string[]);
  }, [transactions]);

  const handleCategoryChange = async (id: string, newCategory: string) => {
    await fetch(`/api/accounts/transactions/${id}/category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategory }),
    });
    // Refetch transactions after update
    const res = await fetch("/api/accounts/transactions");
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions || []);
    }
  };

  const handleCategoryFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setCategoryFilter(selected);
  };

  const filteredTransactions = transactions.filter(tx => {
    let match = true;
    // Merchant filter
    if (merchantFilter.length > 0 && !merchantFilter.includes(tx.merchant && tx.merchant.trim() !== "" ? tx.merchant : "(No Merchant)")) match = false;
    // Account filter
    if (accountFilter.length > 0 && !accountFilter.includes(tx.accountName || "")) match = false;
    // Date filter logic
    const txDateObj = new Date(tx.date);
    const now = new Date();
    if (dateFilter === "ytd") {
      if (txDateObj.getFullYear() !== now.getFullYear() || txDateObj > now) match = false;
    } else if (dateFilter === "thisMonth") {
      if (txDateObj.getFullYear() !== now.getFullYear() || txDateObj.getMonth() !== now.getMonth()) match = false;
    } else if (dateFilter === "pastMonth") {
      const pastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const pastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      if (txDateObj < pastMonth || txDateObj > pastMonthEnd) match = false;
    }
    if (account && tx.accountName !== account) match = false;
    if (categoryFilter.length > 0 && !categoryFilter.includes(tx.personalFinanceCategory || "")) match = false;
    if (merchant) {
      if (merchant === "__EMPTY__") {
        if (tx.merchant && tx.merchant !== "") match = false;
      } else if (tx.merchant !== merchant) match = false;
    }
    if (startDate) {
      const sDate = new Date(startDate);
      if (txDateObj < sDate) match = false;
    }
    if (endDate) {
      const eDate = new Date(endDate);
      if (txDateObj > eDate) match = false;
    }
    return match;
  });

  // Dynamic filter options based on all transactions, not filteredTransactions
  const dynamicAccounts = Array.from(new Set(transactions.map((tx: Transaction) => tx.accountName).filter(Boolean))).sort() as string[];
  const dynamicCategories = Array.from(new Set(transactions.map((tx: Transaction) => tx.personalFinanceCategory).filter(Boolean))).sort() as string[];
  const dynamicMerchants = Array.from(new Set(transactions.map((tx: Transaction) => tx.merchant && tx.merchant.trim() !== "" ? tx.merchant : "(No Merchant)").filter(Boolean))).sort() as string[];

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (!sortBy) return 0;
    let aValue = a[sortBy as keyof Transaction];
    let bValue = b[sortBy as keyof Transaction];
    if (sortBy === "amount") {
      aValue = Number(aValue);
      bValue = Number(bValue);
    } else if (sortBy === "date") {
      aValue = new Date(aValue as string).getTime();
      bValue = new Date(bValue as string).getTime();
    } else {
      aValue = (aValue || "").toString().toLowerCase();
      bValue = (bValue || "").toString().toLowerCase();
    }
    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRefs.category.current && !dropdownRefs.category.current.contains(event.target as Node)
      ) {
        setCategoryDropdownOpen(false);
      }
      if (
        dropdownRefs.account.current && !dropdownRefs.account.current.contains(event.target as Node)
      ) {
        setAccountDropdownOpen(false);
      }
      if (
        dropdownRefs.merchant.current && !dropdownRefs.merchant.current.contains(event.target as Node)
      ) {
        setMerchantDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCategoryCheckboxChange = (cat: string) => {
    setCategoryFilter(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };
  const handleMerchantCheckboxChange = (merchant: string) => {
    setMerchantFilter(prev =>
      prev.includes(merchant)
        ? prev.filter(m => m !== merchant)
        : [...prev, merchant]
    );
  };
  const handleAccountCheckboxChange = (account: string) => {
    setAccountFilter(prev =>
      prev.includes(account)
        ? prev.filter(a => a !== account)
        : [...prev, account]
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          ← Back to Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">Spending Dashboard</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-2 py-1">
                <div className="flex flex-col">
                  <span className="cursor-pointer" onClick={() => handleSort("date")}>Date {sortBy === "date" ? (sortOrder === "asc" ? "▲" : "▼") : ""}</span>
                  <select
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                    className="border rounded px-2 py-1 mt-1"
                  >
                    <option value="all">All</option>
                    <option value="ytd">Year to Date</option>
                    <option value="thisMonth">This Month</option>
                    <option value="pastMonth">Past Month</option>
                  </select>
                </div>
              </th>
              <th className="border px-2 py-1">
                <div className="flex items-center relative">
                  <span className="cursor-pointer mr-2" onClick={() => handleSort("accountName")}>Account {sortBy === "accountName" ? (sortOrder === "asc" ? "▲" : "▼") : ""}</span>
                  <button
                    type="button"
                    className="border rounded px-2 py-1 bg-white text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-1"
                    onClick={() => setAccountDropdownOpen(v => !v)}
                    aria-label="Filter accounts"
                  >
                    <FunnelIcon className="w-4 h-4 text-blue-500" />
                    {accountFilter.length === 0 ? "" : accountFilter.length === 1 ? accountFilter[0] : `${accountFilter.length} selected`}
                  </button>
                  {accountDropdownOpen && (
                    <div ref={dropdownRefs.account} className="absolute z-10 mt-2 left-0 w-48 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-auto" style={{top: '100%'}}>
                      <label className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={accountFilter.length === dynamicAccounts.length}
                          onChange={() => setAccountFilter(accountFilter.length === dynamicAccounts.length ? [] : dynamicAccounts)}
                          className="accent-blue-600" style={{marginRight: '1rem'}}
                        />
                        <span className="text-sm font-semibold">All</span>
                      </label>
                      {dynamicAccounts.map(acc => (
                        <label key={acc} className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={accountFilter.includes(acc)} onChange={() => handleAccountCheckboxChange(acc)} className="accent-blue-600" style={{marginRight: '1rem'}} />
                          <span className="text-sm">{acc}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </th>
              <th className="border px-2 py-1">
                <div className="flex items-center relative">
                  <span className="cursor-pointer mr-2" onClick={() => handleSort("personalFinanceCategory")}>Category {sortBy === "personalFinanceCategory" ? (sortOrder === "asc" ? "▲" : "▼") : ""}</span>
                  <button
                    type="button"
                    className="border rounded px-2 py-1 bg-white text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-1"
                    onClick={() => setCategoryDropdownOpen(v => !v)}
                    aria-label="Filter categories"
                  >
                    <FunnelIcon className="w-4 h-4 text-blue-500" />
                    {categoryFilter.length === 0
                      ? ""
                      : categoryFilter.length === 1
                        ? categoryFilter[0]
                        : `${categoryFilter.length} selected`}
                  </button>
                  {categoryDropdownOpen && (
                    <div ref={dropdownRefs.category} className="absolute z-10 mt-2 left-0 w-48 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-auto" style={{top: '100%'}}>
                      <label className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={categoryFilter.length === dynamicCategories.length}
                          onChange={() => setCategoryFilter(categoryFilter.length === dynamicCategories.length ? [] : dynamicCategories)}
                          className="accent-blue-600" style={{marginRight: '1rem'}}
                        />
                        <span className="text-sm font-semibold">All</span>
                      </label>
                      {dynamicCategories.map(opt => (
                        <label key={opt} className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={categoryFilter.includes(opt)}
                            onChange={() => handleCategoryCheckboxChange(opt)}
                            className="accent-blue-600" style={{marginRight: '1rem'}}
                          />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </th>
              <th className="border px-2 py-1">
                <div className="flex items-center relative">
                  <span className="cursor-pointer mr-2" onClick={() => handleSort("merchant")}>Merchant {sortBy === "merchant" ? (sortOrder === "asc" ? "▲" : "▼") : ""}</span>
                  <button
                    type="button"
                    className="border rounded px-2 py-1 bg-white text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-1"
                    onClick={() => setMerchantDropdownOpen(v => !v)}
                    aria-label="Filter merchants"
                  >
                    <FunnelIcon className="w-4 h-4 text-blue-500" />
                    {merchantFilter.length === 0 ? "" : merchantFilter.length === 1 ? merchantFilter[0] : `${merchantFilter.length} selected`}
                  </button>
                  {merchantDropdownOpen && (
                    <div ref={dropdownRefs.merchant} className="absolute z-10 mt-2 left-0 w-48 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-auto" style={{top: '100%'}}>
                      <label className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={merchantFilter.length === dynamicMerchants.length}
                          onChange={() => setMerchantFilter(merchantFilter.length === dynamicMerchants.length ? [] : dynamicMerchants)}
                          className="accent-blue-600" style={{marginRight: '1rem'}}
                        />
                        <span className="text-sm font-semibold">All</span>
                      </label>
                      {dynamicMerchants.map(m => (
                        <label key={m} className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={merchantFilter.includes(m)} onChange={() => handleMerchantCheckboxChange(m)} className="accent-blue-600" style={{marginRight: '1rem'}} />
                          <span className="text-sm">{m}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </th>
              <th className="border px-2 py-1">
                <div className="flex flex-col">
                  <span className="cursor-pointer" onClick={() => handleSort("amount")}>Amount {sortBy === "amount" ? (sortOrder === "asc" ? "▲" : "▼") : ""}</span>
                  {/* No filter for amount */}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map(tx => (
              <tr key={tx.id}>
                <td className="border px-2 py-1">{tx.date ? new Date(tx.date).toISOString().slice(0, 10) : ""}</td>
                <td className="border px-2 py-1">{tx.accountName || ""}</td>
                <td className="border px-2 py-1">{tx.personalFinanceCategory || ""}</td>
                <td className="border px-2 py-1">{tx.merchant && tx.merchant.trim() !== "" ? tx.merchant : "(No Merchant)"}</td>
                <td className="border px-2 py-1">${tx.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
