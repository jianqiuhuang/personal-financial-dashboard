"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { FunnelIcon } from "@heroicons/react/24/solid";
import { Pie } from 'react-chartjs-2';
import { Bar } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
import { CategoryScale, LinearScale, BarElement } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useRouter, useSearchParams } from "next/navigation";
Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ChartDataLabels);

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
  // --- State ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [merchantFilter, setMerchantFilter] = useState<string[]>([]);
  const [accountFilter, setAccountFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [dateFilter, setDateFilter] = useState("ytd");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [merchantDropdownOpen, setMerchantDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const dropdownRefs = {
    category: useRef<HTMLDivElement>(null),
    account: useRef<HTMLDivElement>(null),
    merchant: useRef<HTMLDivElement>(null),
  };
  const router = useRouter();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;

  // --- Fetch transactions ---
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

  // --- Derived filter options ---
  const dynamicAccounts = useMemo(() => Array.from(new Set(transactions.map(tx => tx.accountName).filter((x): x is string => Boolean(x)))).sort(), [transactions]);
  const dynamicCategories = useMemo(() => Array.from(new Set(transactions.map(tx => tx.personalFinanceCategory).filter((x): x is string => Boolean(x)))).sort(), [transactions]);
  const dynamicMerchants = useMemo(() => Array.from(new Set(transactions.map(tx => tx.merchant && tx.merchant.trim() !== "" ? tx.merchant : "(No Merchant)").filter((x): x is string => Boolean(x)))).sort(), [transactions]);

  // --- Filtered transactions ---
  const filteredTransactions = useMemo(() => transactions.filter(tx => {
    let match = true;
    if (merchantFilter.length > 0 && !merchantFilter.includes(tx.merchant && tx.merchant.trim() !== "" ? tx.merchant : "(No Merchant)")) match = false;
    if (accountFilter.length > 0 && !accountFilter.includes(tx.accountName || "")) match = false;
    const txDateObj = new Date(tx.date);
    const now = new Date();
    if (dateFilter === "ytd") {
      if (txDateObj.getFullYear() !== now.getFullYear() || txDateObj > now) match = false;
    } else if (dateFilter === "lastYear") {
      const lastYear = now.getFullYear() - 1;
      if (txDateObj.getFullYear() !== lastYear) match = false;
    } else if (dateFilter === "thisMonth") {
      if (txDateObj.getFullYear() !== now.getFullYear() || txDateObj.getMonth() !== now.getMonth()) match = false;
    } else if (dateFilter === "pastMonth") {
      const pastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const pastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      if (txDateObj < pastMonth || txDateObj > pastMonthEnd) match = false;
    } else if (dateFilter === "customMonth") {
      if (startDate && endDate) {
        const month = parseInt(startDate, 10) - 1;
        const year = parseInt(endDate, 10);
        if (txDateObj.getFullYear() !== year || txDateObj.getMonth() !== month) match = false;
      }
    }
    if (categoryFilter.length > 0 && !categoryFilter.includes(tx.personalFinanceCategory || "")) match = false;
    if (startDate) {
      const sDate = new Date(startDate);
      if (txDateObj < sDate) match = false;
    }
    if (endDate) {
      const eDate = new Date(endDate);
      if (txDateObj > eDate) match = false;
    }
    return match;
  }), [transactions, accountFilter, categoryFilter, merchantFilter, dateFilter, startDate, endDate]);

  // --- Chart data ---
  const categoryTotals = useMemo(() => {
    const totals: { [cat: string]: number } = {};
    filteredTransactions.forEach(tx => {
      const cat = tx.personalFinanceCategory || "Uncategorized";
      totals[cat] = (totals[cat] || 0) + tx.amount;
    });
    return totals;
  }, [filteredTransactions]);
  const accountTotals = useMemo(() => {
    const totals: { [acc: string]: number } = {};
    filteredTransactions.forEach(tx => {
      const acc = tx.accountName || "Uncategorized";
      totals[acc] = (totals[acc] || 0) + tx.amount;
    });
    return totals;
  }, [filteredTransactions]);

  // --- Set all filters to select all by default ---
  useEffect(() => {
    const defaultCategories = dynamicCategories.filter(cat => cat !== 'LOAN_PAYMENTS');
    setAccountFilter(dynamicAccounts);
    setCategoryFilter(defaultCategories);
    setMerchantFilter(dynamicMerchants);
  }, [dynamicAccounts, dynamicCategories, dynamicMerchants]);

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

  // Pie chart data preparation
  const pieData = {
    labels: Object.keys(categoryTotals),
    datasets: [
      {
        data: Object.values(categoryTotals),
        backgroundColor: [
          '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#38bdf8', '#facc15', '#4ade80', '#cbd5e1', '#818cf8', '#fb7185', '#f59e42', '#10b981', '#eab308', '#6366f1', '#f43f5e', '#22d3ee', '#e5e7eb', '#a3e635'
        ],
        borderWidth: 1,
      },
    ],
  };

  // Account spending data for bar chart
  const accountBarData = {
    labels: Object.keys(accountTotals),
    datasets: [
      {
        label: '',
        data: Object.values(accountTotals),
        backgroundColor: Object.keys(accountTotals).map((_, idx) => ['#60a5fa', '#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#fbbf24', '#facc15', '#4ade80', '#22d3ee', '#10b981', '#eab308', '#6366f1', '#f43f5e', '#e5e7eb', '#a3e635', '#cbd5e1', '#f59e42', '#a3e635', '#f87171'][idx % 20]),
        borderRadius: 12,
      },
    ],
  };

  const dynamicBarChartHeight = Math.max(300, Object.keys(accountTotals).length * 40);

  // Pie chart click handler
  const handlePieClick = (elements: any[]) => {
    if (!elements.length) return;
    const idx = elements[0].index;
    const selectedCategory = pieData.labels[idx];
    setCategoryFilter([selectedCategory]);
  };

  function getDateFilterLabel(filter: string, month: string, year: string) {
    switch (filter) {
      case "all": return "All Dates";
      case "ytd": return "YTD";
      case "lastYear": return "Last Year";
      case "thisMonth": return "This Month";
      case "pastMonth": return "Past Month";
      case "customMonth":
        if (month && year) {
          return `${new Date(0, parseInt(month, 10) - 1).toLocaleString('default', { month: 'long' })} ${year}`;
        }
        return "Month & Year...";
      default: return "Date";
    }
  }

  // Helper to encode filter state to query params
  function encodeFiltersToQuery({ accountFilter, categoryFilter, merchantFilter, dateFilter, startDate, endDate }: {
    accountFilter: string[];
    categoryFilter: string[];
    merchantFilter: string[];
    dateFilter: string;
    startDate: string;
    endDate: string;
  }): string {
    const params = new URLSearchParams();
    if (accountFilter.length > 0) params.set("accounts", accountFilter.join(","));
    if (categoryFilter.length > 0) params.set("categories", categoryFilter.join(","));
    if (merchantFilter.length > 0) params.set("merchants", merchantFilter.join(","));
    if (dateFilter) params.set("dateFilter", dateFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return params.toString();
  }

  // Helper to decode query params to filter state
  function decodeFiltersFromQuery(params: URLSearchParams): {
    accountFilter: string[];
    categoryFilter: string[];
    merchantFilter: string[];
    dateFilter: string;
    startDate: string;
    endDate: string;
  } {
    return {
      accountFilter: params.get("accounts") ? params.get("accounts")!.split(",") : [],
      categoryFilter: params.get("categories") ? params.get("categories")!.split(",") : [],
      merchantFilter: params.get("merchants") ? params.get("merchants")!.split(",") : [],
      dateFilter: params.get("dateFilter") || "ytd",
      startDate: params.get("startDate") || "",
      endDate: params.get("endDate") || "",
    };
  }

  // On initial load, restore filter state from URL
  useEffect(() => {
    if (!searchParams) return;
    const filters = decodeFiltersFromQuery(searchParams);
    if (filters.accountFilter.length) setAccountFilter(filters.accountFilter);
    if (filters.categoryFilter.length) setCategoryFilter(filters.categoryFilter);
    if (filters.merchantFilter.length) setMerchantFilter(filters.merchantFilter);
    if (filters.dateFilter) setDateFilter(filters.dateFilter);
    if (filters.startDate) setStartDate(filters.startDate);
    if (filters.endDate) setEndDate(filters.endDate);
  }, []);

  // On filter change, update URL (pushState)
  useEffect(() => {
    const query = encodeFiltersToQuery({ accountFilter, categoryFilter, merchantFilter, dateFilter, startDate, endDate });
    const url = query ? `/transactions?${query}` : "/transactions";
    window.history.pushState({ filters: { accountFilter, categoryFilter, merchantFilter, dateFilter, startDate, endDate } }, "", url);
  }, [accountFilter, categoryFilter, merchantFilter, dateFilter, startDate, endDate]);

  // Listen for browser navigation (popstate) and restore filter state
  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      const params = new URLSearchParams(window.location.search);
      const filters = decodeFiltersFromQuery(params);
      setAccountFilter(filters.accountFilter);
      setCategoryFilter(filters.categoryFilter);
      setMerchantFilter(filters.merchantFilter);
      setDateFilter(filters.dateFilter);
      setStartDate(filters.startDate);
      setEndDate(filters.endDate);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
        <>
          <div className="mb-8">
            <div className="flex gap-4 mb-6 items-end">
              {/* Date Filter */}
              <div className="relative">
                <label className="block text-xs font-semibold mb-1">Date</label>
                <div className="relative">
                  <button
                    type="button"
                    className="border rounded px-2 py-1 bg-white text-sm text-gray-700 w-48 text-left flex items-center justify-between"
                    onClick={() => setDateDropdownOpen(v => !v)}
                    aria-label="Filter date"
                  >
                    {getDateFilterLabel(dateFilter, startDate, endDate)}
                    <span className="ml-2">▼</span>
                  </button>
                  {dateDropdownOpen && (
                    <div className="absolute z-10 mt-1 left-0 w-48 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-auto">
                      {[{ value: "all", label: "All" }, { value: "ytd", label: "YTD" }, { value: "lastYear", label: "Last Year" }, { value: "thisMonth", label: "This Month" }, { value: "pastMonth", label: "Past Month" }, { value: "customMonth", label: "Month & Year..." }].map(opt => (
                        <label key={opt.value} className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded">
                          <input
                            type="radio"
                            checked={dateFilter === opt.value}
                            onChange={() => { setDateFilter(opt.value); setDateDropdownOpen(false); }}
                            className="accent-blue-600 mr-2"
                          />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      ))}
                      {dateFilter === "customMonth" && (
                        <div className="flex gap-2 px-2 py-2">
                          <select
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="border rounded px-2 py-1 bg-white text-sm text-gray-700 w-20"
                          >
                            <option value="">Month</option>
                            {Array.from({ length: 12 }, (_, i) => (
                              <option key={i} value={String(i + 1).padStart(2, '0')}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                          </select>
                          <select
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="border rounded px-2 py-1 bg-white text-sm text-gray-700 w-20"
                          >
                            <option value="">Year</option>
                            {Array.from({ length: 10 }, (_, i) => (
                              <option key={i} value={String(new Date().getFullYear() - i)}>{new Date().getFullYear() - i}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Account Filter */}
              <div className="relative">
                <label className="block text-xs font-semibold mb-1">Account</label>
                <div className="relative">
                  <button
                    type="button"
                    className="border rounded px-2 py-1 bg-white text-sm text-gray-700 w-48 text-left flex items-center justify-between"
                    onClick={() => setAccountDropdownOpen(v => !v)}
                    aria-label="Filter accounts"
                  >
                    {accountFilter.length === 0 || accountFilter.length === dynamicAccounts.length ? "All Accounts" : `${accountFilter.length} selected`}
                    <span className="ml-2">▼</span>
                  </button>
                  {accountDropdownOpen && (
                    <div ref={dropdownRefs.account} className="absolute z-10 mt-1 left-0 w-48 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-auto">
                      <label className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded">
                        <input
                          type="checkbox"
                          checked={accountFilter.length === dynamicAccounts.length}
                          onChange={() => setAccountFilter(accountFilter.length === dynamicAccounts.length ? [] : dynamicAccounts)}
                          className="accent-blue-600 mr-2"
                        />
                        <span className="text-sm font-semibold">All</span>
                      </label>
                      {dynamicAccounts.map(acc => (
                        <label key={acc} className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded">
                          <input type="checkbox" checked={accountFilter.includes(acc)} onChange={() => handleAccountCheckboxChange(acc)} className="accent-blue-600 mr-2" />
                          <span className="text-sm">{acc}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Category Filter */}
              <div className="relative">
                <label className="block text-xs font-semibold mb-1">Category</label>
                <div className="relative">
                  <button
                    type="button"
                    className="border rounded px-2 py-1 bg-white text-sm text-gray-700 w-48 text-left flex items-center justify-between"
                    onClick={() => setCategoryDropdownOpen(v => !v)}
                    aria-label="Filter categories"
                  >
                    {categoryFilter.length === 0 || categoryFilter.length === dynamicCategories.length ? "All Categories" : `${categoryFilter.length} selected`}
                    <span className="ml-2">▼</span>
                  </button>
                  {categoryDropdownOpen && (
                    <div ref={dropdownRefs.category} className="absolute z-10 mt-1 left-0 w-48 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-auto">
                      <label className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded">
                        <input
                          type="checkbox"
                          checked={categoryFilter.length === dynamicCategories.length}
                          onChange={() => setCategoryFilter(categoryFilter.length === dynamicCategories.length ? [] : dynamicCategories)}
                          className="accent-blue-600 mr-2"
                        />
                        <span className="text-sm font-semibold">All</span>
                      </label>
                      {dynamicCategories.map(opt => (
                        <label key={opt} className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded">
                          <input type="checkbox" checked={categoryFilter.includes(opt)} onChange={() => handleCategoryCheckboxChange(opt)} className="accent-blue-600 mr-2" />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Merchant Filter */}
              <div className="relative">
                <label className="block text-xs font-semibold mb-1">Merchant</label>
                <div className="relative">
                  <button
                    type="button"
                    className="border rounded px-2 py-1 bg-white text-sm text-gray-700 w-48 text-left flex items-center justify-between"
                    onClick={() => setMerchantDropdownOpen(v => !v)}
                    aria-label="Filter merchants"
                  >
                    {merchantFilter.length === 0 || merchantFilter.length === dynamicMerchants.length ? "All Merchants" : `${merchantFilter.length} selected`}
                    <span className="ml-2">▼</span>
                  </button>
                  {merchantDropdownOpen && (
                    <div ref={dropdownRefs.merchant} className="absolute z-10 mt-1 left-0 w-48 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-auto">
                      <label className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded">
                        <input
                          type="checkbox"
                          checked={merchantFilter.length === dynamicMerchants.length}
                          onChange={() => setMerchantFilter(merchantFilter.length === dynamicMerchants.length ? [] : dynamicMerchants)}
                          className="accent-blue-600 mr-2"
                        />
                        <span className="text-sm font-semibold">All</span>
                      </label>
                      {dynamicMerchants.map(m => (
                        <label key={m} className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded">
                          <input type="checkbox" checked={merchantFilter.includes(m)} onChange={() => handleMerchantCheckboxChange(m)} className="accent-blue-600 mr-2" />
                          <span className="text-sm">{m}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                className="border rounded px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 ml-2"
                onClick={() => {
                  setAccountFilter(dynamicAccounts);
                  setCategoryFilter(dynamicCategories.filter(cat => cat !== 'LOAN_PAYMENTS'));
                  setMerchantFilter(dynamicMerchants);
                  setDateFilter('ytd');
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Reset Filters
              </button>
            </div>
            <div className="flex items-start gap-8">
              {/* Account Spending Bar Chart (left) */}
              <div className="w-1/3 min-w-[20rem] flex-1 flex items-center justify-center">
                <div className="w-full h-[30rem] border-2 border-gray-300 rounded-2xl shadow-lg p-6 flex flex-col">
                  <h2 className="text-lg font-semibold mb-4">Spending by Account</h2>
                  <div className="w-full" style={{ height: dynamicBarChartHeight }}>
                    <Bar
                      data={accountBarData}
                      options={{
                        indexAxis: 'y',
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: function(context: any) {
                                const label = context.label || "";
                                const value = context.parsed.x;
                                return `${label}: $${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                              }
                            }
                          },
                          datalabels: {
                            display: false
                          }
                        },
                        hover: {
                          mode: 'nearest',
                          intersect: true
                        },
                        scales: {
                          x: {
                            beginAtZero: true,
                            grid: { display: false },
                            ticks: {
                              callback: function(value: any) {
                                return `$${Number(value).toLocaleString()}`;
                              },
                              color: '#6b7280',
                              font: { weight: 'bold' }
                            }
                          },
                          y: {
                            grid: { display: false },
                            ticks: {
                              display: true,
                              color: '#374151',
                              font: { weight: 'bold', size: 12 },
                              callback: function(value: any) {
                                return accountBarData.labels[value];
                              }
                            }
                          }
                        },
                        onClick: (event: any, elements: any, chart: any) => {
                          if (!elements.length) return;
                          const idx = elements[0].index;
                          const selectedAccount = accountBarData.labels[idx];
                          setAccountFilter([selectedAccount]);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Pie Chart and Legend side by side (right, 2/3 width) */}
              <div className="w-2/3 min-w-[32rem]">
                <div className="border-2 border-gray-300 rounded-2xl shadow-lg p-6 h-[30rem] flex flex-col">
                  <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
                  <div className="flex gap-6 items-start flex-1">
                    <div className="flex-shrink-0 w-1/2 flex items-center justify-center h-full">
                      <div className="w-full h-full flex items-center justify-center">
                        <div style={{ width: '100%', height: '100%' }}>
                          <Pie
                            data={pieData}
                            options={{
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  callbacks: {
                                    label: function(context) {
                                      const label = context.label || "";
                                      const value = context.parsed;
                                      return `${label}: $${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                    }
                                  }
                                },
                                datalabels: {
                                  display: false
                                }
                              },
                              cutout: '70%', // Makes the pie chart a ring (doughnut) chart
                              onClick: (event, elements, chart) => {
                                if (!elements.length) return;
                                const idx = elements[0].index;
                                const selectedCategory = pieData.labels[idx];
                                setCategoryFilter([selectedCategory]);
                            }
                          }}
                          plugins={[ChartDataLabels]}
                        />
                        </div>
                      </div>
                    </div>
                    {/* Category Legend (right of pie chart, inside card) */}
                    <div className="flex-1">
                      <div className="relative" style={{ minHeight: '100%', maxHeight: '100%' }}>
                        <ul className="space-y-2 overflow-y-auto" style={{ maxHeight: '100%' }}>
                          {Object.entries(categoryTotals)
                            .sort((a, b) => b[1] - a[1])
                            .map(([cat, total], idx) => (
                              <li
                                key={cat}
                                className={`flex items-center cursor-pointer rounded ${hoveredCategory === cat ? 'bg-blue-100' : ''}`}
                                onClick={() => setCategoryFilter([cat])}
                                onMouseEnter={() => setHoveredCategory(cat)}
                                onMouseLeave={() => setHoveredCategory(null)}
                              >
                                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: pieData.datasets[0].backgroundColor[pieData.labels.indexOf(cat)] }}></span>
                                <span className="truncate font-semibold text-sm">{cat}</span>
                                <span className="ml-auto text-sm font-semibold">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-2 border-gray-300 rounded-2xl shadow-lg p-6 mt-8">
            <h2 className="text-lg font-semibold mb-4">Transactions</h2>
            <div className="overflow-y-auto" style={{ maxHeight: '30rem' }}>
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("date")}>Date {sortBy === "date" && (<span className={`ml-1 ${sortOrder === "asc" ? "text-gray-700" : "text-gray-400"}`}>{sortOrder === "asc" ? "▲" : "▼"}</span>)}</th>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("accountName")}>Account {sortBy === "accountName" && (<span className={`ml-1 ${sortOrder === "asc" ? "text-gray-700" : "text-gray-400"}`}>{sortOrder === "asc" ? "▲" : "▼"}</span>)}</th>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("personalFinanceCategory")}>Category {sortBy === "personalFinanceCategory" && (<span className={`ml-1 ${sortOrder === "asc" ? "text-gray-700" : "text-gray-400"}`}>{sortOrder === "asc" ? "▲" : "▼"}</span>)}</th>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("merchant")}>Merchant {sortBy === "merchant" && (<span className={`ml-1 ${sortOrder === "asc" ? "text-gray-700" : "text-gray-400"}`}>{sortOrder === "asc" ? "▲" : "▼"}</span>)}</th>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("amount")}>Amount {sortBy === "amount" && (<span className={`ml-1 ${sortOrder === "asc" ? "text-gray-700" : "text-gray-400"}`}>{sortOrder === "asc" ? "▲" : "▼"}</span>)}</th>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("paymentChannel")}>Payment Channel {sortBy === "paymentChannel" && (<span className={`ml-1 ${sortOrder === "asc" ? "text-gray-700" : "text-gray-400"}`}>{sortOrder === "asc" ? "▲" : "▼"}</span>)}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.slice(0, 100).map(tx => (
                    <tr key={tx.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-2 py-1">{tx.date ? new Date(tx.date).toISOString().slice(0, 10) : ""}</td>
                      <td className="px-2 py-1">{tx.accountName || ""}</td>
                      <td className="px-2 py-1">{tx.personalFinanceCategory || ""}</td>
                      <td className="px-2 py-1">{tx.merchant && tx.merchant.trim() !== "" ? tx.merchant : "(No Merchant)"}</td>
                      <td className="px-2 py-1">${tx.amount.toFixed(2)}</td>
                      <td className="px-2 py-1">{tx.paymentChannel || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
