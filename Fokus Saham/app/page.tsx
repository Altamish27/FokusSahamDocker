"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2,
  BarChart,
  LineChart,
  MoonStar,
  Sun,
  TrendingUp,
  ChevronRight,
  Search,
  FileText,
  Newspaper,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

// API URL - in production, this would come from environment variables
const API_URL = "http://localhost:5000" // Replace with your actual API URL

// Define the data structure based on period
interface DailyData {
  Date: string
  ticker: string
  avg_open?: number
  avg_high?: number
  avg_low?: number
  avg_close?: number
  avg_volume?: number
  avg_dividends?: number
  [key: string]: any
}

interface MonthlyData {
  Year: number
  Month: number
  [key: string]: any
}

interface YearlyData {
  Year: number
  [key: string]: any
}

interface FinancialData {
  emiten: string
  entity_name: string
  report_date: string
  revenue: string | number
  gross_profit: string | number
  operating_profit: string | number
  net_profit: string | number
  total_assets: string | number
  liabilities: string | number
  total_equity: string | number
  cash: string | number
  cash_dari_operasi: string | number
  cash_dari_investasi: string | number
  cash_dari_pendanaan: string | number
  [key: string]: any
}

interface NewsData {
  title: string
  content: string
  published_at: string
  link: string
  [key: string]: any
}

interface TickerNewsData {
  headline: string
  summary: string
  sentiment: string
  confidence: number
  reasoning: string
  effective_date: string
  tickers: string[]
  [key: string]: any
}

type StockData = DailyData | MonthlyData | YearlyData

// Top 10 Indonesian tickers
const TOP_TICKERS = [
  { code: "BBCA", name: "Bank Central Asia" },
  { code: "BBRI", name: "Bank Rakyat Indonesia" },
  { code: "BMRI", name: "Bank Mandiri" },
  { code: "TLKM", name: "Telkom Indonesia" },
  { code: "ASII", name: "Astra International" },
  { code: "UNVR", name: "Unilever Indonesia" },
  { code: "ICBP", name: "Indofood CBP" },
  { code: "INDF", name: "Indofood Sukses Makmur" },
  { code: "HMSP", name: "H.M. Sampoerna" },
  { code: "KLBF", name: "Kalbe Farma" },
]

// Sample daily data for testing when API fails
const SAMPLE_DAILY_DATA: DailyData[] = [
  {
    Date: "2024-05-01",
    ticker: "BBCA",
    avg_open: 9500,
    avg_high: 9600,
    avg_low: 9400,
    avg_close: 9550,
    avg_volume: 10000000,
  },
  {
    Date: "2024-05-02",
    ticker: "BBCA",
    avg_open: 9550,
    avg_high: 9650,
    avg_low: 9500,
    avg_close: 9600,
    avg_volume: 9500000,
  },
  {
    Date: "2024-05-03",
    ticker: "BBCA",
    avg_open: 9600,
    avg_high: 9700,
    avg_low: 9550,
    avg_close: 9650,
    avg_volume: 11000000,
  },
  {
    Date: "2024-05-04",
    ticker: "BBCA",
    avg_open: 9650,
    avg_high: 9750,
    avg_low: 9600,
    avg_close: 9700,
    avg_volume: 10500000,
  },
  {
    Date: "2024-05-05",
    ticker: "BBCA",
    avg_open: 9700,
    avg_high: 9800,
    avg_low: 9650,
    avg_close: 9750,
    avg_volume: 9800000,
  },
]

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [allEmitens, setAllEmitens] = useState<string[]>([])
  const [tickers, setTickers] = useState<string[]>([])
  const [filteredTickers, setFilteredTickers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedTicker, setSelectedTicker] = useState<string>("")
  const [period, setPeriod] = useState<string>("daily")
  const [column, setColumn] = useState<string>("avg_close")
  const [chartType, setChartType] = useState<string>("line")
  const [stockData, setStockData] = useState<StockData[]>([])
  const [financialData, setFinancialData] = useState<FinancialData[]>([])
  const [tickerNews, setTickerNews] = useState<TickerNewsData[]>([])
  const [generalNews, setGeneralNews] = useState<NewsData[]>([])
  const [selectedQuarter, setSelectedQuarter] = useState<string>("Q1")
  const [loading, setLoading] = useState<boolean>(false)
  const [financialLoading, setFinancialLoading] = useState<boolean>(false)
  const [newsLoading, setNewsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [tickersLoading, setTickersLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<string>("stockData")
  const [tickersWithFinancials, setTickersWithFinancials] = useState<Set<string>>(new Set())
  const [tickersWithNews, setTickersWithNews] = useState<Set<string>>(new Set())
  const [csvLoading, setCsvLoading] = useState<boolean>(true)
  const [usingSampleData, setUsingSampleData] = useState<boolean>(false)

  // Available columns for selection (removed stock_splits as requested)
  const columns = [
    { value: "avg_open", label: "Open Price" },
    { value: "avg_close", label: "Close Price" },
    { value: "avg_volume", label: "Volume" },
    { value: "avg_dividends", label: "Dividends" },
  ]

  // Fetch CSV data
  useEffect(() => {
    const fetchCsvData = async () => {
      setCsvLoading(true)
      try {
        const response = await fetch(
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/emiten-RTtVJOuJYEEm0HdTBGISgYWG4FbWl7.csv",
        )
        const csvText = await response.text()

        // Parse CSV (simple parsing, assuming no commas in values)
        const lines = csvText.split("\n")
        const headers = lines[0].split(",")
        const symbolIndex = headers.findIndex((h) => h.trim().toLowerCase() === "symbol")

        if (symbolIndex === -1) {
          console.error("Symbol column not found in CSV")
          return
        }

        // Extract symbols from CSV
        const symbols = lines
          .slice(1)
          .map((line) => {
            const values = line.split(",")
            return values[symbolIndex]?.trim()
          })
          .filter(Boolean) // Remove empty values

        setAllEmitens(symbols)
      } catch (err) {
        console.error("Error fetching CSV data:", err)
      } finally {
        setCsvLoading(false)
      }
    }

    fetchCsvData()
  }, [])

  // Fetch all available tickers on component mount
  useEffect(() => {
    const fetchTickers = async () => {
      setTickersLoading(true)
      try {
        // First try the /api/tickers endpoint
        console.log("Attempting to fetch tickers from /api/tickers")
        const response = await axios.get(`${API_URL}/api/tickers`)

        if (response.data && Array.isArray(response.data)) {
          console.log("Successfully fetched tickers from /api/tickers")
          const apiTickers = response.data
          const uniqueTickers = new Set([...TOP_TICKERS.map((t) => t.code), ...apiTickers, ...allEmitens])
          const tickerList = Array.from(uniqueTickers).sort()
          setTickers(tickerList)

          // Set default selected ticker
          if (tickerList.length > 0 && !selectedTicker) {
            setSelectedTicker(tickerList[0])
          }
        } else {
          throw new Error("Invalid tickers data format")
        }
      } catch (err) {
        console.error("Error fetching tickers from /api/tickers:", err)

        try {
          // Try alternative endpoint to extract tickers from daily data
          console.log("Attempting to fetch a sample ticker to extract available tickers")
          const altResponse = await axios.get(`${API_URL}/api/daily_aggregation_ticker`)

          if (altResponse.data && Array.isArray(altResponse.data)) {
            console.log("Successfully fetched data from alternative endpoint")
            // Extract unique tickers from the response
            const extractedTickers = new Set<string>()
            altResponse.data.forEach((item: any) => {
              if (item.ticker) extractedTickers.add(item.ticker)
            })

            const uniqueTickers = new Set([
              ...TOP_TICKERS.map((t) => t.code),
              ...Array.from(extractedTickers),
              ...allEmitens,
            ])
            const tickerList = Array.from(uniqueTickers).sort()
            setTickers(tickerList)

            if (!selectedTicker && tickerList.length > 0) {
              setSelectedTicker(tickerList[0])
            }
          } else {
            throw new Error("Invalid data format from alternative endpoint")
          }
        } catch (altErr) {
          console.error("Error fetching from alternative endpoint:", altErr)

          // Final fallback to TOP_TICKERS and CSV data
          console.log("Falling back to hardcoded tickers and CSV data")
          const uniqueTickers = new Set([...TOP_TICKERS.map((t) => t.code), ...allEmitens])
          const tickerList = Array.from(uniqueTickers).sort()
          setTickers(tickerList)

          if (!selectedTicker && tickerList.length > 0) {
            setSelectedTicker(tickerList[0])
          }
        }
      } finally {
        setTickersLoading(false)
      }
    }

    if (!csvLoading) {
      fetchTickers()
    }
  }, [csvLoading, allEmitens])

  // Fetch general news and tickers with data on component mount
  useEffect(() => {
    fetchGeneralNews()
    fetchTickersWithData()
  }, [])

  // Fetch tickers that have financial data and news
  const fetchTickersWithData = async () => {
    try {
      // Try to fetch financial data for all quarters
      try {
        const [q1Response, q2Response, q3Response, q4Response] = await Promise.all([
          axios.get(`${API_URL}/api/lapkeuQ1/2024`),
          axios.get(`${API_URL}/api/lapkeuQ2/2024`),
          axios.get(`${API_URL}/api/lapkeuQ3/2024`),
          axios.get(`${API_URL}/api/lapkeuQ4/2024`),
        ])

        // Combine all financial data tickers
        const financialTickers = new Set<string>()

        if (q1Response.data && Array.isArray(q1Response.data)) {
          q1Response.data.forEach((item: FinancialData) => {
            if (item.emiten) financialTickers.add(item.emiten)
          })
        }

        if (q2Response.data && Array.isArray(q2Response.data)) {
          q2Response.data.forEach((item: FinancialData) => {
            if (item.emiten) financialTickers.add(item.emiten)
          })
        }

        if (q3Response.data && Array.isArray(q3Response.data)) {
          q3Response.data.forEach((item: FinancialData) => {
            if (item.emiten) financialTickers.add(item.emiten)
          })
        }

        if (q4Response.data && Array.isArray(q4Response.data)) {
          q4Response.data.forEach((item: FinancialData) => {
            if (item.emiten) financialTickers.add(item.emiten)
          })
        }

        setTickersWithFinancials(financialTickers)
      } catch (err) {
        console.error("Error fetching financial data:", err)
        setTickersWithFinancials(new Set())
      }

      // Try to fetch ticker news
      try {
        const newsResponse = await axios.get(`${API_URL}/api/beritaTicker`)

        // Extract tickers from news
        const newsTickers = new Set<string>()

        if (newsResponse.data && Array.isArray(newsResponse.data)) {
          newsResponse.data.forEach((item: TickerNewsData) => {
            if (item.tickers && Array.isArray(item.tickers)) {
              item.tickers.forEach((ticker) => newsTickers.add(ticker))
            }
          })
        }

        setTickersWithNews(newsTickers)
      } catch (err) {
        console.error("Error fetching ticker news:", err)
        setTickersWithNews(new Set())
      }
    } catch (err) {
      console.error("Error in fetchTickersWithData:", err)
    }
  }

  // Filter tickers based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTickers(tickers)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = tickers.filter((ticker) => ticker.toLowerCase().includes(query))
      setFilteredTickers(filtered)
    }
  }, [searchQuery, tickers])

  // Fetch stock data when ticker, period, or column changes
  useEffect(() => {
    if (selectedTicker && column) {
      fetchStockData()
    }
  }, [selectedTicker, period, column])

  // Fetch financial data when ticker or quarter changes
  useEffect(() => {
    if (selectedTicker && activeTab === "financialData") {
      fetchFinancialData()
    }
  }, [selectedTicker, selectedQuarter, activeTab])

  // Fetch news data when ticker changes and news tab is active
  useEffect(() => {
    if (selectedTicker && activeTab === "newsData") {
      fetchTickerNews()
    }
  }, [selectedTicker, activeTab])

  // Update the fetchStockData function to fix the daily data issue
  const fetchStockData = async () => {
    setLoading(true)
    setError(null)
    setUsingSampleData(false)

    // Log the current state to help with debugging
    console.log(`Fetching stock data for ticker: ${selectedTicker}, period: ${period}, column: ${column}`)

    try {
      // Try the standard endpoint format first
      console.log(`Attempting: ${API_URL}/api/stock-data?ticker=${selectedTicker}&period=${period}`)
      const response = await axios.get(`${API_URL}/api/stock-data?ticker=${selectedTicker}&period=${period}`)

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`Successfully fetched ${response.data.length} records`)
        console.log(`Sample data:`, response.data.slice(0, 2))
        setStockData(response.data)
      } else {
        throw new Error("No data or invalid data format received")
      }
    } catch (err) {
      console.error("Error fetching stock data from primary endpoint:", err)

      try {
        // Try alternative endpoint format
        console.log(`Trying alternative endpoint: ${API_URL}/api/${period}/${selectedTicker}/${column}`)
        const altResponse = await axios.get(`${API_URL}/api/${period}/${selectedTicker}/${column}`)

        if (altResponse.data && Array.isArray(altResponse.data) && altResponse.data.length > 0) {
          console.log(`Alternative endpoint successful with ${altResponse.data.length} records`)
          console.log(`Sample data:`, altResponse.data.slice(0, 2))
          setStockData(altResponse.data)
        } else {
          throw new Error("No data or invalid data format received from alternative endpoint")
        }
      } catch (altErr) {
        console.error("Error fetching stock data from alternative endpoint:", altErr)

        try {
          // Try a third endpoint format that might be available
          console.log(
            `Trying third endpoint format: ${API_URL}/api/${period}_aggregation_ticker/${selectedTicker}/${column}`,
          )
          const thirdResponse = await axios.get(
            `${API_URL}/api/${period}_aggregation_ticker/${selectedTicker}/${column}`,
          )

          if (thirdResponse.data && Array.isArray(thirdResponse.data) && thirdResponse.data.length > 0) {
            console.log(`Third endpoint successful with ${thirdResponse.data.length} records`)
            console.log(`Sample data:`, thirdResponse.data.slice(0, 2))
            setStockData(thirdResponse.data)
          } else {
            throw new Error("No data or invalid data format received from third endpoint")
          }
        } catch (thirdErr) {
          console.error("Error fetching stock data from third endpoint:", thirdErr)

          // If all endpoints fail for daily data, use sample data
          if (period === "daily") {
            console.log("Using sample daily data as fallback")
            // Create sample data with the selected ticker
            const sampleData = SAMPLE_DAILY_DATA.map((item) => ({
              ...item,
              ticker: selectedTicker,
            }))
            setStockData(sampleData)
            setUsingSampleData(true)
          } else {
            setStockData([])
            setError(`Failed to fetch ${period} data for ${selectedTicker}. Please try a different ticker or period.`)
          }
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // Update the preparePlotData function to better handle daily data
  const preparePlotData = () => {
    if (!stockData.length) return []

    let xValues: (string | number)[] = []
    let yValues: number[] = []

    console.log("Preparing plot data for period:", period)
    console.log("Stock data sample:", stockData.slice(0, 2))

    // Extract x and y values based on period type
    if (period === "daily") {
      const dailyData = stockData as DailyData[]

      // Log the data structure to help debug
      console.log("Daily data structure:", Object.keys(dailyData[0] || {}))

      // Sort by date
      dailyData.sort((a, b) => {
        if (!a.Date || !b.Date) return 0
        return new Date(a.Date).getTime() - new Date(b.Date).getTime()
      })

      // Check if we have the expected column in the data
      if (dailyData.length > 0 && column in dailyData[0]) {
        console.log(`Column ${column} found in data`)
      } else {
        console.warn(`Column ${column} not found in data`)
        // Try to find an alternative column that might contain the data
        const availableColumns = dailyData.length > 0 ? Object.keys(dailyData[0]) : []
        console.log("Available columns:", availableColumns)
      }

      xValues = dailyData.map((item) => item.Date || "")
      yValues = dailyData.map((item) => {
        // Handle different possible data structures
        if (typeof item[column] === "number") {
          return item[column]
        } else if (item.avg_close && typeof item.avg_close === "number" && column === "avg_close") {
          return item.avg_close
        } else if (item.close && typeof item.close === "number" && (column === "avg_close" || column === "close")) {
          return item.close
        } else {
          console.warn(`Could not find value for column ${column} in item:`, item)
          return 0
        }
      })
    } else if (period === "monthly") {
      // Existing monthly data handling
      const monthlyData = stockData as MonthlyData[]
      monthlyData.sort((a, b) => {
        if (a.Year !== b.Year) return (a.Year || 0) - (b.Year || 0)
        return (a.Month || 0) - (b.Month || 0)
      })
      xValues = monthlyData.map((item) => {
        const year = item.Year || 0
        const month = item.Month || 0
        const monthStr = month.toString().padStart(2, "0")
        return `${year}-${monthStr}`
      })
      yValues = monthlyData.map((item) => (typeof item[column] === "number" ? item[column] : 0))
    } else if (period === "yearly") {
      // Existing yearly data handling
      const yearlyData = stockData as YearlyData[]
      yearlyData.sort((a, b) => (a.Year || 0) - (b.Year || 0))
      xValues = yearlyData.map((item) => item.Year || 0)
      yValues = yearlyData.map((item) => (typeof item[column] === "number" ? item[column] : 0))
    }

    console.log("Plot data prepared:", { xValues: xValues.length, yValues: yValues.length })

    // Return different chart types based on selection
    if (chartType === "bar") {
      return [
        {
          x: xValues,
          y: yValues,
          type: "bar",
          name: columns.find((c) => c.value === column)?.label || column,
          marker: {
            color: theme === "dark" ? "rgba(16, 185, 129, 0.8)" : "rgba(5, 150, 105, 0.8)",
            line: {
              color: theme === "dark" ? "rgb(16, 185, 129)" : "rgb(5, 150, 105)",
              width: 1.5,
            },
          },
        },
      ]
    } else {
      // Line chart WITH markers for all data types (including daily)
      return [
        {
          x: xValues,
          y: yValues,
          type: "scatter",
          mode: "lines+markers", // Show both lines and markers for all periods
          name: columns.find((c) => c.value === column)?.label || column,
          line: {
            color: theme === "dark" ? "rgb(16, 185, 129)" : "rgb(5, 150, 105)",
            width: 3,
            shape: "spline", // Smooth line
          },
          marker: {
            size: 6,
            color: theme === "dark" ? "rgb(16, 185, 129)" : "rgb(5, 150, 105)",
            line: {
              color: theme === "dark" ? "rgb(30, 41, 59)" : "white",
              width: 1.5,
            },
          },
        },
      ]
    }
  }

  const fetchFinancialData = async () => {
    setFinancialLoading(true)
    setError(null)

    try {
      const response = await axios.get(`${API_URL}/api/lapkeu${selectedQuarter}/2024`)

      if (response.data && Array.isArray(response.data)) {
        // Filter for the selected ticker
        const tickerData = response.data.filter((item) => item.emiten === selectedTicker)
        setFinancialData(tickerData)
      } else {
        setFinancialData([])
        setError("Invalid financial data format received from the server")
      }
    } catch (err: any) {
      console.error("Error fetching financial data:", err)
      setError(err.response?.data?.error || "Failed to fetch financial data. Please try again later.")
      setFinancialData([])
    } finally {
      setFinancialLoading(false)
    }
  }

  const fetchTickerNews = async () => {
    setNewsLoading(true)
    setError(null)

    try {
      const response = await axios.get(`${API_URL}/api/beritaTicker`)

      if (response.data && Array.isArray(response.data)) {
        // Filter for the selected ticker
        const tickerData = response.data.filter(
          (item) => item.tickers && Array.isArray(item.tickers) && item.tickers.includes(selectedTicker),
        )
        setTickerNews(tickerData)
      } else {
        setTickerNews([])
        setError("Invalid news data format received from the server")
      }
    } catch (err: any) {
      console.error("Error fetching ticker news:", err)
      setError(err.response?.data?.error || "Failed to fetch news data. Please try again later.")
      setTickerNews([])
    } finally {
      setNewsLoading(false)
    }
  }

  const fetchGeneralNews = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/beritaUmum`)

      if (response.data && Array.isArray(response.data)) {
        setGeneralNews(response.data)
      } else {
        setGeneralNews([])
      }
    } catch (err) {
      console.error("Error fetching general news:", err)
      setGeneralNews([])
    }
  }

  // Get high and low price data for informational display
  const getHighLowData = () => {
    if (!stockData.length) return { high: "N/A", low: "N/A" }

    const highValues: number[] = []
    const lowValues: number[] = []

    stockData.forEach((item) => {
      if (typeof item.avg_high === "number") {
        highValues.push(item.avg_high)
      }
      if (typeof item.avg_low === "number") {
        lowValues.push(item.avg_low)
      }
    })

    if (highValues.length === 0 || lowValues.length === 0) {
      return { high: "N/A", low: "N/A" }
    }

    const maxHigh = Math.max(...highValues)
    const minLow = Math.min(...lowValues)

    return {
      high: maxHigh.toFixed(2),
      low: minLow.toFixed(2),
    }
  }

  // Get ticker name from code
  const getTickerName = (code: string) => {
    const ticker = TOP_TICKERS.find((t) => t.code === code)
    return ticker ? ticker.name : code
  }

  // Format currency values
  const formatCurrency = (value: string | number) => {
    if (typeof value === "string") {
      // Try to convert scientific notation to number
      value = Number(value)
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date)
    } catch (e) {
      return dateString
    }
  }

  // Get sentiment badge color
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case "positive":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "negative":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "neutral":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const { high, low } = getHighLowData()

  useEffect(() => {
    // Set document title
    document.title = "Fokus Saham - Visualisasi Data Saham Indonesia"
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center">
            <TrendingUp className="h-6 w-6 text-primary mr-2" />
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">
              Fokus Saham
            </h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container py-6">
        {/* General News Section (Always at the top) */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Latest Market News</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generalNews.slice(0, 4).map((news, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{news.title}</CardTitle>
                  <CardDescription>{news.published_at}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3">{news.content}</p>
                  <div className="mt-4">
                    <a
                      href={news.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      Read more
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Top 10 Tickers */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Badge variant="outline" className="mr-2 bg-primary/10 text-primary">
              Top
            </Badge>
            Indonesian Tickers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {TOP_TICKERS.map((ticker) => (
              <Button
                key={ticker.code}
                variant={selectedTicker === ticker.code ? "default" : "outline"}
                className="justify-start h-auto py-3"
                onClick={() => setSelectedTicker(ticker.code)}
              >
                <div className="flex flex-col items-start">
                  <span className="font-bold">{ticker.code}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">{ticker.name}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-medium mb-2 flex items-center">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
                    Select Ticker
                  </h2>
                  <div className="relative mb-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Search ticker..."
                      className="pl-10 border-primary/20"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={selectedTicker} onValueChange={setSelectedTicker} disabled={loading || tickersLoading}>
                    <SelectTrigger className="border-primary/20">
                      <SelectValue placeholder={tickersLoading ? "Loading tickers..." : "Select a ticker"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTickers.map((ticker) => (
                        <SelectItem key={ticker} value={ticker}>
                          <div className="flex items-center">
                            {ticker}
                            {tickersWithFinancials.has(ticker) && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Financials
                              </Badge>
                            )}
                            {tickersWithNews.has(ticker) && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                News
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground mt-1">
                    {tickersLoading ? "Loading tickers..." : `${filteredTickers.length} tickers available`}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-medium mb-2 flex items-center">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
                    Select Data Column
                  </h2>
                  <Select value={column} onValueChange={setColumn} disabled={loading}>
                    <SelectTrigger className="border-primary/20">
                      <SelectValue placeholder="Select data column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col.value} value={col.value}>
                          {col.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-medium mb-2 flex items-center">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
                    Time Period
                  </h2>
                  <Tabs defaultValue={period} onValueChange={setPeriod} className="w-full">
                    <TabsList className="grid grid-cols-3 w-full">
                      <TabsTrigger value="daily">Daily</TabsTrigger>
                      <TabsTrigger value="monthly">Monthly</TabsTrigger>
                      <TabsTrigger value="yearly">Yearly</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div>
                  <h2 className="text-lg font-medium mb-2 flex items-center">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
                    Chart Type
                  </h2>
                  <div className="flex space-x-2">
                    <Button
                      variant={chartType === "line" ? "default" : "outline"}
                      onClick={() => setChartType("line")}
                      disabled={loading}
                      className="flex-1"
                    >
                      <LineChart className="h-4 w-4 mr-2" />
                      Line
                    </Button>
                    <Button
                      variant={chartType === "bar" ? "default" : "outline"}
                      onClick={() => setChartType("bar")}
                      disabled={loading}
                      className="flex-1"
                    >
                      <BarChart className="h-4 w-4 mr-2" />
                      Bar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        {selectedTicker && (
          <Tabs defaultValue="stockData" className="mb-6" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="stockData" className="flex items-center">
                <LineChart className="h-4 w-4 mr-2" />
                Stock Data
              </TabsTrigger>
              <TabsTrigger
                value="financialData"
                className="flex items-center"
                disabled={!tickersWithFinancials.has(selectedTicker)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Financial Statements
              </TabsTrigger>
              <TabsTrigger
                value="newsData"
                className="flex items-center"
                disabled={!tickersWithNews.has(selectedTicker)}
              >
                <Newspaper className="h-4 w-4 mr-2" />
                News
              </TabsTrigger>
            </TabsList>

            {/* Stock Data Tab */}
            <TabsContent value="stockData">
              {/* Refresh button */}
              <div className="mb-6">
                <Button
                  onClick={fetchStockData}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Refresh Data"
                  )}
                </Button>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-destructive/15 text-destructive border border-destructive/30 px-4 py-3 rounded-md mb-6">
                  {error}
                  {!usingSampleData && (
                    <div className="mt-2">
                      <p>Pastikan API server berjalan di {API_URL}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Sample data notice */}
              {usingSampleData && (
                <div className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-4 py-3 rounded-md mb-6">
                  Note: Using sample data for demonstration purposes. API data could not be retrieved.
                </div>
              )}

              {/* Chart */}
              <Card className="mb-6 overflow-hidden bg-card/50 backdrop-blur-sm border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold flex items-center">
                        <Badge className="mr-2">{selectedTicker}</Badge>
                        <span className="text-lg">{getTickerName(selectedTicker)}</span>
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {columns.find((c) => c.value === column)?.label || column} •{" "}
                        {period.charAt(0).toUpperCase() + period.slice(1)} Data
                      </p>
                    </div>

                    {/* High/Low information */}
                    <div className="flex space-x-4">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">High</div>
                        <div className="font-bold text-green-500">{high}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Low</div>
                        <div className="font-bold text-red-500">{low}</div>
                      </div>
                    </div>
                  </div>

                  <div className="h-[500px] relative">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : stockData.length > 0 ? (
                      <Plot
                        data={preparePlotData()}
                        layout={{
                          autosize: true,
                          height: 450,
                          margin: { l: 50, r: 50, b: 50, t: 10, pad: 4 },
                          xaxis: {
                            title: period === "daily" ? "Date" : period === "monthly" ? "Year-Month" : "Year",
                            gridcolor: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                            linecolor: theme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                            tickangle: period === "daily" ? 45 : 0, // Angle the date labels for better readability
                          },
                          yaxis: {
                            title: columns.find((c) => c.value === column)?.label || column,
                            gridcolor: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                            linecolor: theme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                            tickformat: ",.2f", // Format with commas and 2 decimal places
                            showticklabels: true, // Ensure tick labels are visible
                            showgrid: true, // Show grid lines
                            zeroline: true, // Show zero line
                            zerolinecolor: theme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                            zerolinewidth: 1,
                            automargin: true, // Add margin to ensure labels are visible
                          },
                          plot_bgcolor: "transparent",
                          paper_bgcolor: "transparent",
                          font: {
                            color: theme === "dark" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
                          },
                          hovermode: "closest",
                        }}
                        config={{
                          responsive: true,
                          displayModeBar: true,
                          displaylogo: false,
                          modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d", "toggleSpikelines"],
                        }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No data available for the selected ticker and period
                      </div>
                    )}

                    {/* Futuristic overlay elements */}
                    <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-primary/30"></div>
                    <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-primary/30"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-primary/30"></div>
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-primary/30"></div>
                  </div>
                </CardContent>
              </Card>

              {/* Data table */}
              {stockData.length > 0 && (
                <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                  <CardContent className="pt-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center">
                      <ChevronRight className="h-5 w-5 text-primary mr-1" />
                      Data Summary
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-primary/10">
                            {period === "daily" && <th className="py-2 px-4 text-left">Date</th>}
                            {period === "monthly" && (
                              <>
                                <th className="py-2 px-4 text-left">Year</th>
                                <th className="py-2 px-4 text-left">Month</th>
                              </>
                            )}
                            {period === "yearly" && <th className="py-2 px-4 text-left">Year</th>}
                            <th className="py-2 px-4 text-left">
                              {columns.find((c) => c.value === column)?.label || column}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockData.slice(0, 10).map((item, index) => (
                            <tr key={index} className="border-b border-primary/5 hover:bg-primary/5">
                              {period === "daily" && <td className="py-2 px-4">{(item as DailyData).Date || "N/A"}</td>}
                              {period === "monthly" && (
                                <>
                                  <td className="py-2 px-4">{(item as MonthlyData).Year || "N/A"}</td>
                                  <td className="py-2 px-4">{(item as MonthlyData).Month || "N/A"}</td>
                                </>
                              )}
                              {period === "yearly" && (
                                <td className="py-2 px-4">{(item as YearlyData).Year || "N/A"}</td>
                              )}
                              <td className="py-2 px-4 font-mono">
                                {typeof item[column] === "number" ? item[column].toFixed(2) : item[column] || "N/A"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {stockData.length > 10 && (
                        <div className="text-center text-muted-foreground mt-2">
                          Showing 10 of {stockData.length} records
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Financial Statements Tab */}
            <TabsContent value="financialData">
              <div className="grid grid-cols-1 gap-6 mb-6">
                <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-lg font-medium mb-2 flex items-center">
                          <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
                          Select Quarter
                        </h2>
                        <Tabs defaultValue={selectedQuarter} onValueChange={setSelectedQuarter} className="w-full">
                          <TabsList className="grid grid-cols-4 w-full">
                            <TabsTrigger value="Q1">Q1 2024</TabsTrigger>
                            <TabsTrigger value="Q2">Q2 2024</TabsTrigger>
                            <TabsTrigger value="Q3">Q3 2024</TabsTrigger>
                            <TabsTrigger value="Q4">Q4 2024</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      <div>
                        <Button
                          onClick={fetchFinancialData}
                          disabled={financialLoading}
                          className="w-full bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90"
                        >
                          {financialLoading ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            "Load Financial Data"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Data Display */}
                <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Badge className="mr-2">{selectedTicker}</Badge>
                      <span>Financial Statement - {selectedQuarter} 2024</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {financialLoading ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : financialData.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-lg font-medium mb-4">Income Statement</h3>
                          <Table>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium">Revenue</TableCell>
                                <TableCell>{formatCurrency(financialData[0].revenue)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Gross Profit</TableCell>
                                <TableCell>{formatCurrency(financialData[0].gross_profit)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Operating Profit</TableCell>
                                <TableCell>{formatCurrency(financialData[0].operating_profit)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Net Profit</TableCell>
                                <TableCell>{formatCurrency(financialData[0].net_profit)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>

                        <div>
                          <h3 className="text-lg font-medium mb-4">Balance Sheet</h3>
                          <Table>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium">Total Assets</TableCell>
                                <TableCell>{formatCurrency(financialData[0].total_assets)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Liabilities</TableCell>
                                <TableCell>{formatCurrency(financialData[0].liabilities)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Total Equity</TableCell>
                                <TableCell>{formatCurrency(financialData[0].total_equity)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Cash</TableCell>
                                <TableCell>{formatCurrency(financialData[0].cash)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>

                        <div className="md:col-span-2">
                          <h3 className="text-lg font-medium mb-4">Cash Flow</h3>
                          <Table>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium">Cash from Operations</TableCell>
                                <TableCell>{formatCurrency(financialData[0].cash_dari_operasi)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Cash from Investing</TableCell>
                                <TableCell>{formatCurrency(financialData[0].cash_dari_investasi)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Cash from Financing</TableCell>
                                <TableCell>{formatCurrency(financialData[0].cash_dari_pendanaan)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        No financial data available for {selectedTicker} in {selectedQuarter} 2024
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* News Tab */}
            <TabsContent value="newsData">
              <div className="grid grid-cols-1 gap-6 mb-6">
                <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-lg font-medium mb-2 flex items-center">
                          <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
                          News for {selectedTicker}
                        </h2>
                        <Button
                          onClick={fetchTickerNews}
                          disabled={newsLoading}
                          className="w-full bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90"
                        >
                          {newsLoading ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            "Refresh News"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* News Display */}
                {newsLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : tickerNews.length > 0 ? (
                  tickerNews.map((news, index) => (
                    <Card key={index} className="bg-card/50 backdrop-blur-sm border-primary/20">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{news.headline}</CardTitle>
                          <Badge className={`${getSentimentColor(news.sentiment)}`}>
                            {news.sentiment} ({(news.confidence * 100).toFixed(0)}%)
                          </Badge>
                        </div>
                        <CardDescription>{formatDate(news.effective_date)}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">Summary</h3>
                            <p>{news.summary}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">Analysis</h3>
                            <p>{news.reasoning}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {news.tickers.map((ticker, i) => (
                              <Badge key={i} variant="outline" className="bg-primary/10">
                                {ticker}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground bg-card/50 backdrop-blur-sm border-primary/20 rounded-lg">
                    No news available for {selectedTicker}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0 border-primary/10">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2025 Fokus Saham. Developed by <span className="font-medium text-primary">Hasbi Haqqul Fikri</span>
          </p>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">Data provided by MongoDB</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
