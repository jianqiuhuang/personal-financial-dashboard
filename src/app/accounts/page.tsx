"use client";
import { useState, useEffect } from "react";
import { AccountCard } from "@/components/AccountCard";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { Account } from "@/types/account";
import { ManualAccountForm } from "@/components/ManualAccountForm";
import { PlusIcon } from "@heroicons/react/24/solid";
import { usePlaidLink } from "react-plaid-link";

export default function AccountsPage() {
  const [showHidden, setShowHidden] = useState(false);
  const [institutionShowHidden, setInstitutionShowHidden] = useState<Record<string, boolean>>({});
  const [showManualForm, setShowManualForm] = useState(false);
  const [isConnectingCoinbase, setIsConnectingCoinbase] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const { data: accountsData, refetch } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await fetch("/api/accounts");
      if (!response.ok) throw new Error("Failed to fetch accounts");
      return response.json();
    },
  });

  // Plaid link logic
  const onSuccess = async (public_token: string) => {
    try {
      const response = await fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token }),
      });
      if (!response.ok) throw new Error("Failed to exchange token");
      refetch();
    } catch (error) {
      console.error("Error linking account:", error);
    }
  };
  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess });

  // Fetch Plaid link token
  useEffect(() => {
    async function fetchLinkToken() {
      const response = await fetch("/api/plaid/create-link-token");
      if (response.ok) {
        const data = await response.json();
        setLinkToken(data.link_token);
      }
    }
    fetchLinkToken();
  }, []);

  // Add Coinbase connect logic
  const connectCoinbase = async () => {
    try {
      setIsConnectingCoinbase(true);
      const response = await fetch("/api/crypto/oauth");
      if (!response.ok) throw new Error("Failed to get Coinbase auth URL");
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error connecting to Coinbase:", error);
    } finally {
      setIsConnectingCoinbase(false);
    }
  };

  if (!accountsData) return <div>Loading...</div>;

  const accountsByInstitution = accountsData.reduce((acc, account) => {
    if (account.institution && !acc[account.institution]) {
      acc[account.institution] = [];
    }
    if (account.institution) {
      acc[account.institution].push(account);
    }
    return acc;
  }, {} as Record<string, Account[]>);

  const hiddenAccounts = accountsData.filter((account) => account.hidden) || [];

  const toggleInstitutionHidden = (institution: string) => {
    setInstitutionShowHidden((prev) => ({
      ...prev,
      [institution]: !prev[institution],
    }));
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Accounts</h2>
        <button
          onClick={() => setShowHidden(!showHidden)}
          className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          {showHidden ? (
            <>
              <EyeSlashIcon className="w-5 h-5" />
              <span>Hide hidden accounts</span>
            </>
          ) : (
            <>
              <EyeIcon className="w-5 h-5" />
              <span>Show hidden accounts</span>
            </>
          )}
        </button>
      </div>
      {/* Add account management buttons here */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setShowManualForm(true)}
          className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Manual Account
        </button>
        <button
          onClick={connectCoinbase}
          disabled={isConnectingCoinbase}
          className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {isConnectingCoinbase ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              Connecting...
            </div>
          ) : (
            "Connect Coinbase"
          )}
        </button>
        <button
          onClick={() => open()}
          disabled={!ready}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Connect Bank
        </button>
      </div>
      <div className="space-y-8">
        {Object.entries(accountsByInstitution).map(
          ([institution, institutionAccounts]) => {
            const institutionLogo = institutionAccounts[0]?.institutionLogo;
            const showHiddenForInstitution = institutionShowHidden[institution] || false;
            const visibleAccounts = institutionAccounts.filter((account) => !account.hidden);
            const hiddenAccounts = institutionAccounts.filter((account) => account.hidden);
            const hasHiddenAccounts = hiddenAccounts.length > 0;
            return (
              <div key={institution} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    {institutionLogo && (
                      <img src={institutionLogo} alt={institution} className="w-6 h-6 object-contain" />
                    )}
                    <h2 className="text-lg font-semibold">{institution}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasHiddenAccounts && (
                      <button
                        onClick={() => toggleInstitutionHidden(institution)}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        title={showHiddenForInstitution ? "Hide hidden accounts" : "Show hidden accounts"}
                      >
                        {showHiddenForInstitution ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">
                          {showHiddenForInstitution ? "Hide" : "Show"} Hidden ({hiddenAccounts.length})
                        </span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {institutionAccounts
                    .filter((account) => !account.hidden || showHiddenForInstitution)
                    .map((account) => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        onBalanceUpdate={refetch}
                        isMasked={false}
                      />
                    ))}
                </div>
              </div>
            );
          }
        )}
      </div>
      {hiddenAccounts.length > 0 && showHidden && (
        <>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Hidden Accounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hiddenAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onBalanceUpdate={refetch}
                isMasked={false}
              />
            ))}
          </div>
        </>
      )}
      {/* Manual Account Form Dialog */}
      {showManualForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add Manual Account</h2>
            <ManualAccountForm
              onSuccess={() => {
                setShowManualForm(false);
                refetch();
              }}
              onCancel={() => setShowManualForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
