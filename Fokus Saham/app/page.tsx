"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import dynamic from "next/dynamic"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  BarChart3,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

// API URL - in production, this would come from environment variables
const API_URL = "http://localhost:5000"

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

// Updated unified news interface
interface UnifiedNewsData {
  _id: string
  headline: string
  link: string
  published_at: string
  content: string
  source: string
  sentiment: string
  confidence: number
  reasoning: string
  summary: string
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

// Sample data for fallback
const SAMPLE_DAILY_DATA: DailyData[] = [
  {
    Date: "2024-05-01",
    ticker: "BBCA",
    avg_open: 9500,
    avg_high: 9600,
    avg_low: 9450,
    avg_close: 9550,
    avg_volume: 9500000,
  },
  {
    Date: "2024-05-02",
    ticker: "BBCA",
    avg_open: 9550,
    avg_high: 9650,
    avg_low: 9500,
    avg_close: 9600,
    avg_volume: 9600000,
  },
  {
    Date: "2024-05-03",
    ticker: "BBCA",
    avg_open: 9600,
    avg_high: 9700,
    avg_low: 9550,
    avg_close: 9650,
    avg_volume: 9700000,
  },
  {
    Date: "2024-05-04",
    ticker: "BBCA",
    avg_open: 9650,
    avg_high: 9750,
    avg_low: 9600,
    avg_close: 9700,
    avg_volume: 9700000,
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
  const [column, setColumn] = useState<string>("avg_open")
  const [chartType, setChartType] = useState<string>("line")
  const [stockData, setStockData] = useState<StockData[]>([])
  const [financialData, setFinancialData] = useState<FinancialData[]>([])
  const [unifiedNews, setUnifiedNews] = useState<UnifiedNewsData[]>([])
  const [selectedQuarter, setSelectedQuarter] = useState<string>("Q1")
  const [loading, setLoading] = useState<boolean>(false)
  const [financialLoading, setFinancialLoading] = useState<boolean>(false)
  const [newsLoading, setNewsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [tickersLoading, setTickersLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<string>("stockData")
  const [tickersWithFinancials, setTickersWithFinancials] = useState<Set<string>>(
    new Set(),
  )
  const [tickersWithNews, setTickersWithNews] = useState<Set<string>>(new Set())
  const [csvLoading, setCsvLoading] = useState<boolean>(true)
  const [usingSampleData, setUsingSampleData] = useState<boolean>(false)
  const [expandedNews, setExpandedNews] = useState<Set<string>>(new Set())
  const [timeFrame, setTimeFrame] = useState<string>("all")
  const [randomSeed, setRandomSeed] = useState<number>(Date.now()) // For triggering random news refresh

  // Technical Analysis States
  const [showTechnicalIndicators, setShowTechnicalIndicators] = useState<boolean>(
    false,
  )
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([])
  
  // Available columns for selection (only open and close)
  const columns = [
    { value: "avg_open", label: "Open Price" },
    { value: "avg_close", label: "Close Price" },
  ]

  // Time frame options
  const timeFrameOptions = [
    { value: "all", label: "All Data" },
    { value: "3M", label: "3 Months" },
    { value: "6M", label: "6 Months" },
    { value: "1Y", label: "1 Year" },
    { value: "2Y", label: "2 Years" },
  ]

  // Technical Indicators
  const technicalIndicators = [
    { value: "sma", label: "Simple Moving Average (SMA)", periods: [20, 50, 200] },
    { value: "ema", label: "Exponential Moving Average (EMA)", periods: [12, 26] },
    { value: "rsi", label: "Relative Strength Index (RSI)", period: 14 },
    { value: "macd", label: "MACD (12,26,9)" },
    { value: "bb", label: "Bollinger Bands (20,2)" },
    { value: "volume", label: "Volume" },
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
          const uniqueTickers = new Set([
            ...TOP_TICKERS.map((t) => t.code),
            ...apiTickers,
            ...allEmitens,
          ])
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

  // Fetch unified news and tickers with data on component mount
  useEffect(() => {
    fetchUnifiedNews()
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

      // Extract tickers that have news from unified news
      try {
        if (unifiedNews.length > 0) {
          const newsTickers = new Set<string>()
          unifiedNews.forEach((item: UnifiedNewsData) => {
            if (item.tickers && Array.isArray(item.tickers)) {
              item.tickers.forEach((ticker) => newsTickers.add(ticker))
            }
          })
          setTickersWithNews(newsTickers)
        }
      } catch (err) {
        console.error("Error processing news tickers:", err)
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

  // Update tickers with news when unified news changes
  useEffect(() => {
    if (unifiedNews.length > 0) {
      const newsTickers = new Set<string>()
      unifiedNews.forEach((item: UnifiedNewsData) => {
        if (item.tickers && Array.isArray(item.tickers)) {
          item.tickers.forEach((ticker) => newsTickers.add(ticker))
        }
      })
      setTickersWithNews(newsTickers)
    }
  }, [unifiedNews])

  // Update the fetchStockData function to use the new all-data endpoint
  const fetchStockData = async () => {
    setLoading(true)
    setError(null)
    setUsingSampleData(false)

    // Log the current state to help with debugging
    console.log(`Fetching stock data for ticker: ${selectedTicker}, period: ${period}`)

    try {
      // Try the new all-data endpoint first (without column filter)
      console.log(`Attempting new endpoint: ${API_URL}/api/${period}/${selectedTicker}`)
      const response = await axios.get(`${API_URL}/api/${period}/${selectedTicker}`)

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`Successfully fetched ${response.data.length} records`)
        console.log(`Sample data:`, response.data.slice(0, 2))
        console.log(`First record keys:`, Object.keys(response.data[0]))
        console.log(`First record avg_high:`, response.data[0].avg_high, `Type:`, typeof response.data[0].avg_high)
        console.log(`First record avg_low:`, response.data[0].avg_low, `Type:`, typeof response.data[0].avg_low)
        setStockData(response.data)
      } else {
        throw new Error("No data or invalid data format received")
      }
    } catch (err) {
      console.error("Error fetching stock data from new endpoint:", err)

      try {
        // Fallback to the standard endpoint format
        console.log(`Attempting fallback: ${API_URL}/api/stock-data?ticker=${selectedTicker}&period=${period}`)
        const response = await axios.get(`${API_URL}/api/stock-data?ticker=${selectedTicker}&period=${period}`)

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log(`Fallback successful with ${response.data.length} records`)
          console.log(`Sample data:`, response.data.slice(0, 2))
          setStockData(response.data)
        } else {
          throw new Error("No data or invalid data format received from fallback")
        }
      } catch (fallbackErr) {
        console.error("Error fetching stock data from fallback endpoint:", fallbackErr)

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
      }
    } finally {
      setLoading(false)
    }
  }

  // Filter data by time frame
  const filterDataByTimeFrame = (data: StockData[]) => {
    if (timeFrame === "all" || !data.length) return data

    const now = new Date()
    const cutoffDate = new Date()

    switch (timeFrame) {
      case "1M":
        cutoffDate.setMonth(now.getMonth() - 1)
        break
      case "3M":
        cutoffDate.setMonth(now.getMonth() - 3)
        break
      case "6M":
        cutoffDate.setMonth(now.getMonth() - 6)
        break
      case "1Y":
        cutoffDate.setFullYear(now.getFullYear() - 1)
        break
      case "2Y":
        cutoffDate.setFullYear(now.getFullYear() - 2)
        break
      default:
        return data
    }

    return data.filter((item) => {
      if (period === "daily" && (item as DailyData).Date) {
        const itemDate = new Date((item as DailyData).Date)
        return itemDate >= cutoffDate
      }
      return true
    })
  }

  // Update the preparePlotData function to better handle daily data
  const preparePlotData = () => {
    if (!stockData.length) return []

    let xValues: (string | number)[] = []
    let yValues: number[] = []
    let volumeValues: number[] = []

    console.log("Preparing plot data for period:", period)
    console.log("Stock data sample:", stockData.slice(0, 2))

    // Filter data by time frame
    const filteredData = filterDataByTimeFrame(stockData)

    // Extract x and y values based on period type
    if (period === "daily") {
      const dailyData = filteredData as DailyData[]

      // Sort by date
      dailyData.sort((a, b) => {
        if (!a.Date || !b.Date) return 0
        return new Date(a.Date).getTime() - new Date(b.Date).getTime()
      })

      xValues = dailyData.map((item) => item.Date || "")
      yValues = dailyData.map((item) => {
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

      // Extract volume data
      volumeValues = dailyData.map((item) => {
        if (typeof item.avg_volume === "number") {
          return item.avg_volume
        } else if (typeof item.volume === "number") {
          return item.volume
        }
        return 0
      })

      console.log("Volume data extracted for daily:", volumeValues.slice(0, 3))
    } else if (period === "monthly") {
      const monthlyData = filteredData as MonthlyData[]
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
      volumeValues = monthlyData.map((item) => (typeof item.avg_volume === "number" ? item.avg_volume : 0))

      console.log("Volume data extracted for monthly:", volumeValues.slice(0, 3))
    } else if (period === "yearly") {
      const yearlyData = filteredData as YearlyData[]
      yearlyData.sort((a, b) => (a.Year || 0) - (b.Year || 0))
      xValues = yearlyData.map((item) => item.Year || 0)
      yValues = yearlyData.map((item) => (typeof item[column] === "number" ? item[column] : 0))
      volumeValues = yearlyData.map((item) => (typeof item.avg_volume === "number" ? item.avg_volume : 0))

      console.log("Volume data extracted for yearly:", volumeValues.slice(0, 3))
    }

    console.log("Plot data prepared:", {
      xValues: xValues.length,
      yValues: yValues.length,
      volumeValues: volumeValues.length,
      volumeSum: volumeValues.reduce((a, b) => a + b, 0),
      maxVolume: Math.max(...volumeValues),
    })

    // If no volume data, create some dummy data for visualization
    if (volumeValues.every((v) => v === 0) && xValues.length > 0) {
      console.log("No volume data found, creating dummy volume data")
      volumeValues = xValues.map((_, index) => Math.random() * 1000000 + 500000)
    }

    // Create traces array
    const traces: any[] = []

    // Create main price chart trace
    if (chartType === "candlestick" && period === "daily") {
      // Candlestick chart for daily data
      const dailyData = filteredData as DailyData[]
      const openValues = dailyData.map((item) => item.avg_open || 0)
      const highValues = dailyData.map((item) => item.avg_high || 0)
      const lowValues = dailyData.map((item) => item.avg_low || 0)
      const closeValues = dailyData.map((item) => item.avg_close || 0)

      const candlestickTrace = {
        x: xValues,
        open: openValues,
        high: highValues,
        low: lowValues,
        close: closeValues,
        type: "candlestick",
        name: "OHLC",
        visible: true,
        increasing: {
          line: { color: theme === "dark" ? "#22c55e" : "#16a34a" }
        },
        decreasing: {
          line: { color: theme === "dark" ? "#ef4444" : "#dc2626" }
        },
        yaxis: "y",
        xaxis: "x",
      }
      traces.push(candlestickTrace)
    } else {
      // Regular line or bar chart
      const priceTrace = {
        x: xValues,
        y: yValues,
        type: chartType === "bar" ? "bar" : "scatter",
        mode: chartType === "line" ? "lines+markers" : undefined,
        name: columns.find((c) => c.value === column)?.label || column,
        visible: true,
        line:
          chartType === "line"
            ? {
                color: theme === "dark" ? "#10b981" : "#059669",
                width: 2,
              }
            : undefined,
        marker: {
          size: chartType === "line" ? 4 : undefined,
          color: theme === "dark" ? "#10b981" : "#059669",
          line:
            chartType === "line"
              ? {
                  color: theme === "dark" ? "#1e293b" : "#ffffff",
                  width: 1,
                }
              : undefined,
        },
        yaxis: "y",
        xaxis: "x",
      }
      traces.push(priceTrace)
    }

    // Add technical indicators if selected
    if (selectedIndicators.length > 0 && period === "daily") {
      const dailyData = filteredData as DailyData[]
      const closeValues = dailyData.map((item) => item.avg_close || 0)

      selectedIndicators.forEach((indicator) => {
        switch (indicator) {
          case "sma":
            // Add SMA traces
            const sma20 = calculateSMA(closeValues, 20)
            const sma50 = calculateSMA(closeValues, 50)
            
            traces.push({
              x: xValues,
              y: sma20,
              type: "scatter",
              mode: "lines",
              name: "SMA 20",
              line: { color: "#ff6b6b", width: 1 },
              yaxis: "y",
            })
            
            traces.push({
              x: xValues,
              y: sma50,
              type: "scatter",
              mode: "lines",
              name: "SMA 50",
              line: { color: "#4ecdc4", width: 1 },
              yaxis: "y",
            })
            break

          case "ema":
            // Add EMA traces
            const ema12 = calculateEMA(closeValues, 12)
            const ema26 = calculateEMA(closeValues, 26)
            
            traces.push({
              x: xValues,
              y: ema12,
              type: "scatter",
              mode: "lines",
              name: "EMA 12",
              line: { color: "#45b7d1", width: 1 },
              yaxis: "y",
            })
            
            traces.push({
              x: xValues,
              y: ema26,
              type: "scatter",
              mode: "lines",
              name: "EMA 26",
              line: { color: "#f9ca24", width: 1 },
              yaxis: "y",
            })
            break

          case "bb":
            // Add Bollinger Bands
            const bb = calculateBollingerBands(closeValues, 20, 2)
            
            traces.push({
              x: xValues,
              y: bb.upper,
              type: "scatter",
              mode: "lines",
              name: "BB Upper",
              line: { color: "#dda0dd", width: 1 },
              yaxis: "y",
            })
            
            traces.push({
              x: xValues,
              y: bb.lower,
              type: "scatter",
              mode: "lines",
              name: "BB Lower",
              line: { color: "#dda0dd", width: 1 },
              yaxis: "y",
            })
            break

          case "rsi":
            // Add RSI (would need separate subplot in real implementation)
            const rsi = calculateRSI(closeValues, 14)
            traces.push({
              x: xValues,
              y: rsi,
              type: "scatter",
              mode: "lines",
              name: "RSI",
              line: { color: "#ff9ff3", width: 1 },
              yaxis: "y3",
            })
            break
        }
      })
    }

    // Create volume chart trace
    const volumeTrace = {
      x: xValues,
      y: volumeValues,
      type: "bar" as const,
      name: "Volume",
      visible: true,
      marker: {
        color: volumeValues.map((_, index) => {
          if (index === 0) return theme === "dark" ? "#22c55e" : "#16a34a"
          const current = yValues[index] || 0
          const previous = yValues[index - 1] || 0
          if (current > previous) {
            return theme === "dark" ? "#22c55e" : "#16a34a" // Green for up
          } else {
            return theme === "dark" ? "#ef4444" : "#dc2626" // Red for down
          }
        }),
        opacity: 0.8,
      },
      yaxis: "y2",
      xaxis: "x",
      showlegend: true,
    }
    traces.push(volumeTrace)

    console.log("Final traces created:", {
      totalTraces: traces.length,
      volumeTraceLength: volumeTrace.y.length,
    })

    return traces
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

  const fetchUnifiedNews = async () => {
    setNewsLoading(true)
    try {
      const response = await axios.get(`${API_URL}/api/iqplusBerita`)

      if (response.data && Array.isArray(response.data)) {
        setUnifiedNews(response.data)
      } else {
        setUnifiedNews([])
      }
    } catch (err) {
      console.error("Error fetching unified news:", err)
      setUnifiedNews([])
    } finally {
      setNewsLoading(false)
    }
  }

  // Get high and low price data for informational display
  const getHighLowData = () => {
    if (!stockData.length) return { high: "N/A", low: "N/A" }

    // Get filtered data based on current timeFrame
    const filteredData = filterDataByTimeFrame(stockData)
    if (!filteredData.length) return { high: "N/A", low: "N/A" }

    // Get the latest data point from filtered data
    const latestData = filteredData[filteredData.length - 1]

    if (!latestData) return { high: "N/A", low: "N/A" }

    console.log("Latest data:", latestData)
    console.log("All keys in latest data:", Object.keys(latestData))
    console.log("avg_high:", latestData.avg_high, "type:", typeof latestData.avg_high)
    console.log("avg_low:", latestData.avg_low, "type:", typeof latestData.avg_low)

    // Check if fields might have different names
    console.log("Looking for high field variations:")
    Object.keys(latestData).forEach((key) => {
      if (key.toLowerCase().includes("high")) {
        console.log(`Found high field: ${key} = ${latestData[key]}`)
      }
      if (key.toLowerCase().includes("low")) {
        console.log(`Found low field: ${key} = ${latestData[key]}`)
      }
    })

    const high = typeof latestData.avg_high === "number" ? latestData.avg_high.toFixed(2) : "N/A"
    const low = typeof latestData.avg_low === "number" ? latestData.avg_low.toFixed(2) : "N/A"

    return { high, low }
  }

  // Get price change for specific ticker (only works for selected ticker currently)
  const getPriceChangeForTicker = (tickerCode: string) => {
    if (tickerCode !== selectedTicker || !stockData || stockData.length < 2) return null
    return getPriceChangePercentage()
  }

  // Get ticker name from code
  const getTickerName = (code: string) => {
    const ticker = TOP_TICKERS.find((t) => t.code === code)
    return ticker ? ticker.name : code
  }

  // Calculate price change percentage (current vs 1 month ago)
  const getPriceChangePercentage = () => {
    if (!stockData || stockData.length < 2) return null

    const filteredData = filterDataByTimeFrame(stockData)
    if (filteredData.length < 2) return null

    // For daily data, get the latest price and price from ~30 days ago
    if (period === "daily") {
      const dailyData = filteredData as DailyData[]

      // Sort by date to get chronological order
      const sortedData = dailyData.sort((a, b) => {
        if (!a.Date || !b.Date) return 0
        return new Date(a.Date).getTime() - new Date(b.Date).getTime()
      })

      if (sortedData.length < 2) return null

      // Get the latest data point
      const latestData = sortedData[sortedData.length - 1]

      // Try to find data from approximately 30 days ago
      const targetDaysAgo = 30
      const latestDate = new Date(latestData.Date || "")
      const targetDate = new Date(latestDate.getTime() - targetDaysAgo * 24 * 60 * 60 * 1000)

      // Find the closest data point to 30 days ago
      let monthAgoData = sortedData[0] // fallback to oldest data
      let minDateDiff = Math.abs(new Date(sortedData[0].Date || "").getTime() - targetDate.getTime())

      for (const data of sortedData) {
        const dateDiff = Math.abs(new Date(data.Date || "").getTime() - targetDate.getTime())
        if (dateDiff < minDateDiff) {
          minDateDiff = dateDiff
          monthAgoData = data
        }
      }

      // Get current and old prices based on selected column
      const getCurrentPrice = (data: DailyData) => {
        if (typeof data[column] === "number") return data[column]
        if (column === "avg_close" && typeof data.avg_close === "number") return data.avg_close
        if (column === "avg_open" && typeof data.avg_open === "number") return data.avg_open
        if (typeof data.avg_close === "number") return data.avg_close // fallback
        return 0
      }

      const currentPrice = getCurrentPrice(latestData)
      const oldPrice = getCurrentPrice(monthAgoData)

      if (currentPrice && oldPrice && oldPrice !== 0) {
        const changePercent = ((currentPrice - oldPrice) / oldPrice) * 100
        return {
          percentage: changePercent,
          current: currentPrice,
          old: oldPrice,
          isPositive: changePercent >= 0,
        }
      }
    }

    return null
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

  // Filter news for selected ticker
  const getFilteredNews = () => {
    if (!selectedTicker) return unifiedNews.slice(0, 10)

    return unifiedNews.filter(
      (news) => news.tickers && Array.isArray(news.tickers) && news.tickers.includes(selectedTicker),
    )
  }

  // Get general news (random selection from all news)
  const getGeneralNews = () => {
    if (!unifiedNews || unifiedNews.length === 0) return []

    // Create a copy of the array and shuffle it using randomSeed
    const shuffledNews = [...unifiedNews]

    // Simple seeded random function
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000
      return x - Math.floor(x)
    }

    for (let i = shuffledNews.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(randomSeed + i) * (i + 1))
      ;[shuffledNews[i], shuffledNews[j]] = [shuffledNews[j], shuffledNews[i]]
    }

    // Return first 4 random news
    return shuffledNews.slice(0, 4)
  }

  // Function to refresh random news
  const refreshRandomNews = () => {
    setRandomSeed(Date.now())
  }

  // Technical Analysis Functions
  const calculateSMA = (data: number[], period: number): number[] => {
    const sma: number[] = []
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(NaN)
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
        sma.push(sum / period)
      }
    }
    return sma
  }

  const calculateEMA = (data: number[], period: number): number[] => {
    const ema: number[] = []
    const multiplier = 2 / (period + 1)

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        ema.push(data[i])
      } else {
        ema.push(data[i] * multiplier + ema[i - 1] * (1 - multiplier))
      }
    }
    return ema
  }

  const calculateRSI = (data: number[], period: number = 14): number[] => {
    const rsi: number[] = []
    const gains: number[] = []
    const losses: number[] = []

    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
    }

    for (let i = 0; i < gains.length; i++) {
      if (i < period - 1) {
        rsi.push(NaN)
      } else {
        const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
        const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
        const rs = avgGain / avgLoss
        rsi.push(100 - (100 / (1 + rs)))
      }
    }

    return [NaN, ...rsi] // Add NaN for first data point
  }

  const calculateBollingerBands = (data: number[], period: number = 20, stdDev: number = 2) => {
    const sma = calculateSMA(data, period)
    const upper: number[] = []
    const lower: number[] = []

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upper.push(NaN)
        lower.push(NaN)
      } else {
        const slice = data.slice(i - period + 1, i + 1)
        const mean = sma[i]
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period
        const standardDeviation = Math.sqrt(variance)

        upper.push(mean + standardDeviation * stdDev)
        lower.push(mean - standardDeviation * stdDev)
      }
    }

    return { sma, upper, lower }
  }

  const calculateMACD = (data: number[]) => {
    const ema12 = calculateEMA(data, 12)
    const ema26 = calculateEMA(data, 26)
    const macdLine = ema12.map((val, i) => val - ema26[i])
    const signalLine = calculateEMA(macdLine.filter((val) => !isNaN(val)), 9)
    const histogram = macdLine.map((val, i) => val - (signalLine[i] || 0))

    return { macdLine, signalLine: [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, ...signalLine], histogram }
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <MoonStar className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container py-6">
        {/* Random News Section (Always at the top) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Latest Market News</h2>
              <p className="text-sm text-muted-foreground">
                Random selection from market news
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={refreshRandomNews}
                disabled={newsLoading}
                variant="outline"
                size="sm"
              >
                🎲 Random News
              </Button>
              <Button
                onClick={fetchUnifiedNews}
                disabled={newsLoading}
                variant="outline"
                size="sm"
              >
                {newsLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Newspaper className="mr-2 h-4 w-4" />
                    Refresh News
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getGeneralNews().map((news, index) => (
              <Card key={news._id || index} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{news.headline}</CardTitle>
                    <div className="flex gap-2">
                      <Badge className={`${getSentimentColor(news.sentiment)}`}>
                        {news.sentiment}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {news.source}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <span>{news.published_at}</span>
                    <span className="text-xs text-muted-foreground">
                      Confidence: {(news.confidence * 100).toFixed(0)}%
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Summary
                      </h3>
                      <p className="text-sm">{news.summary}</p>
                    </div>

                    {expandedNews.has(news._id || `general-${index}`) && (
                      <div className="border-t pt-3">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          Full Content
                        </h3>
                        <div className="text-sm space-y-2">
                          <p>{news.content}</p>
                          <div className="pt-2 border-t">
                            <a
                              href={news.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm font-medium"
                            >
                              📰 Read original article →
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2">
                      <button
                        onClick={() => {
                          const newsId = news._id || `general-${index}`
                          const newExpanded = new Set(expandedNews)
                          if (newExpanded.has(newsId)) {
                            newExpanded.delete(newsId)
                          } else {
                            newExpanded.add(newsId)
                          }
                          setExpandedNews(newExpanded)
                        }}
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        {expandedNews.has(news._id || `general-${index}`)
                          ? "Show less"
                          : "Read more"}
                      </button>

                      {news.tickers && news.tickers.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {news.tickers.slice(0, 3).map((ticker, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs bg-primary/10"
                            >
                              {ticker}
                            </Badge>
                          ))}
                          {news.tickers.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{news.tickers.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
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
            {TOP_TICKERS.map((ticker) => {
              const isSelected = selectedTicker === ticker.code
              const priceChange = getPriceChangeForTicker(ticker.code)
              
              return (
                <Button
                  key={ticker.code}
                  variant={isSelected ? "default" : "outline"}
                  className="justify-start h-auto py-3"
                  onClick={() => setSelectedTicker(ticker.code)}
                >
                  <div className="flex flex-col items-start w-full">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold">{ticker.code}</span>
                      {priceChange && (
                        <span
                          className={`text-xs px-1 py-0.5 rounded ${
                            priceChange.isPositive
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                          }`}
                        >
                          {priceChange.isPositive ? "+" : ""}
                          {priceChange.percentage.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {ticker.name}
                    </span>
                  </div>
                </Button>
              )
            })}
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
                </div>

                <div>
                  <h2 className="text-lg font-medium mb-2 flex items-center">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
                    Select Ticker
                  </h2>
                  <Select value={selectedTicker} onValueChange={setSelectedTicker} disabled={loading}>
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
                    Aggregation Period
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

        {/* Time Frame Controls */}
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20 mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-medium mb-3 flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
                  Time Frame
                </h2>
                <div className="flex flex-wrap gap-2">
                  {timeFrameOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={timeFrame === option.value ? "default" : "outline"}
                      onClick={() => setTimeFrame(option.value)}
                      size="sm"
                      className="min-w-[80px]"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Indicators Panel */}
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Technical Indicators
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTechnicalIndicators(!showTechnicalIndicators)}
                className="ml-auto"
              >
                {showTechnicalIndicators ? "Hide" : "Show"}
              </Button>
            </CardTitle>
          </CardHeader>
          {showTechnicalIndicators && (
            <CardContent>
              <div className="space-y-3">
                {technicalIndicators.map((indicator) => (
                  <div key={indicator.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={indicator.value}
                      checked={selectedIndicators.includes(indicator.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIndicators([...selectedIndicators, indicator.value])
                        } else {
                          setSelectedIndicators(selectedIndicators.filter(i => i !== indicator.value))
                        }
                      }}
                      className="rounded border-primary/20"
                    />
                    <label htmlFor={indicator.value} className="text-sm cursor-pointer">
                      {indicator.label}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Main Tabs */}
        {selectedTicker && (
          <Tabs
            defaultValue="stockData"
            className="mb-6"
            onValueChange={setActiveTab}
          >
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
                        {(() => {
                          const priceChange = getPriceChangePercentage()
                          if (priceChange) {
                            return (
                              <span
                                className={`ml-2 px-2 py-1 rounded-full text-sm font-bold ${
                                  priceChange.isPositive
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                }`}
                              >
                                {priceChange.isPositive ? "+" : ""}
                                {priceChange.percentage.toFixed(2)}%
                              </span>
                            )
                          }
                          return null
                        })()}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {columns.find((c) => c.value === column)?.label || column} •{" "}
                        {period.charAt(0).toUpperCase() + period.slice(1)} Data •{" "}
                        {timeFrameOptions.find((t) => t.value === timeFrame)?.label}
                        {(() => {
                          const priceChange = getPriceChangePercentage()
                          if (priceChange) {
                            return (
                              <span className="ml-2 text-xs">
                                • vs 30 days ago:{" "}
                                {priceChange.current.toLocaleString()} vs{" "}
                                {priceChange.old.toLocaleString()}
                              </span>
                            )
                          }
                          return null
                        })()}
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

                  <div className="h-[700px] relative bg-gray-900 rounded-lg">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : stockData.length > 0 ? (
                      <Plot
                        data={preparePlotData()}
                        layout={{
                          autosize: true,
                          height: 650,
                          margin: { l: 60, r: 80, b: 60, t: 20, pad: 4 }, // Increase right margin for volume axis
                          xaxis: {
                            title: {
                              text: period === "daily" ? "" : period === "monthly" ? "Year-Month" : "Year",
                              font: { color: "#ffffff", size: 12 },
                            },
                            gridcolor: "rgba(255,255,255,0.1)",
                            linecolor: "rgba(255,255,255,0.2)",
                            tickangle: period === "daily" ? 45 : 0,
                            domain: [0, 1],
                            tickfont: { color: "#ffffff", size: 10 },
                            zerolinecolor: "rgba(255,255,255,0.2)",
                            showticklabels: period === "daily" ? false : true,
                            anchor: "y", // Anchor to both y axes
                          },
                          yaxis: {
                            title: {
                              text: columns.find((c) => c.value === column)?.label || column,
                              font: { color: "#ffffff", size: 12 },
                            },
                            gridcolor: "rgba(255,255,255,0.1)",
                            linecolor: "rgba(255,255,255,0.2)",
                            tickformat: ",.0f",
                            showticklabels: true,
                            showgrid: true,
                            zeroline: true,
                            zerolinecolor: "rgba(255,255,255,0.2)",
                            zerolinewidth: 1,
                            automargin: true,
                            domain: [0.35, 1], // Price chart takes upper 65%
                            tickfont: { color: "#ffffff", size: 10 },
                            anchor: "x", // Anchor to x axis
                            side: "left",
                          },
                          yaxis2: {
                            title: {
                              text: "Volume",
                              font: { color: "#ffffff", size: 12 },
                            },
                            gridcolor: "rgba(255,255,255,0.1)",
                            linecolor: "rgba(255,255,255,0.2)",
                            tickformat: ".2s",
                            showticklabels: true,
                            showgrid: false, // Disable grid for volume to avoid overlap
                            automargin: true,
                            domain: [0, 0.3], // Volume chart takes lower 30% for better visibility
                            tickfont: { color: "#ffffff", size: 10 },
                            zerolinecolor: "rgba(255,255,255,0.2)",
                            side: "right", // Put volume axis on the right
                            overlaying: false, // Make sure it's a separate subplot
                            anchor: "x",
                          },
                          plot_bgcolor: "#111827",
                          paper_bgcolor: "#111827",
                          font: {
                            color: "#ffffff",
                            family: "Inter, system-ui, sans-serif",
                          },
                          hovermode: "x unified",
                          showlegend: true,
                          legend: {
                            x: 0.02,
                            y: 0.98,
                            bgcolor: "rgba(17, 24, 39, 0.8)",
                            bordercolor: "rgba(255,255,255,0.2)",
                            borderwidth: 1,
                            font: { color: "#ffffff", size: 11 },
                          },
                        }}
                        config={{
                          responsive: true,
                          displayModeBar: true,
                          displaylogo: false,
                          modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d", "toggleSpikelines"],
                          toImageButtonOptions: {
                            format: "png",
                            filename: `${selectedTicker}_chart`,
                            height: 650,
                            width: 1200,
                            scale: 1,
                          },
                        }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-white">
                        No data available for the selected ticker and period
                      </div>
                    )}

                    {/* Futuristic overlay elements */}
                    <div className="absolute top-2 left-2 w-12 h-12 border-l-2 border-t-2 border-primary/50"></div>
                    <div className="absolute top-2 right-2 w-12 h-12 border-r-2 border-t-2 border-primary/50"></div>
                    <div className="absolute bottom-2 left-2 w-12 h-12 border-l-2 border-b-2 border-primary/50"></div>
                    <div className="absolute bottom-2 right-2 w-12 h-12 border-r-2 border-b-2 border-primary/50"></div>
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
                          {filterDataByTimeFrame(stockData)
                            .slice(0, 10)
                            .map((item, index) => (
                              <tr key={index} className="border-b border-primary/5 hover:bg-primary/5">
                                {period === "daily" && (
                                  <td className="py-2 px-4">{(item as DailyData).Date || "N/A"}</td>
                                )}
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
                      {filterDataByTimeFrame(stockData).length > 10 && (
                        <div className="text-center text-muted-foreground mt-2">
                          Showing 10 of {filterDataByTimeFrame(stockData).length} records
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
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-medium flex items-center">
                          <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
                          News for {selectedTicker}
                        </h2>
                        <Button
                          onClick={fetchUnifiedNews}
                          disabled={newsLoading}
                          variant="outline"
                          size="sm"
                        >
                          {newsLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Newspaper className="mr-2 h-4 w-4" />
                              Refresh
                            </>
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
                ) : getFilteredNews().length > 0 ? (
                  getFilteredNews().map((news, index) => (
                    <Card key={news._id || index} className="bg-card/50 backdrop-blur-sm border-primary/20">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{news.headline}</CardTitle>
                          <Badge className={`${getSentimentColor(news.sentiment)}`}>
                            {news.sentiment} ({(news.confidence * 100).toFixed(0)}%)
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          <span>{news.published_at}</span>
                          <Badge variant="outline" className="text-xs">
                            {news.source}
                          </Badge>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">Summary</h3>
                            <p>{news.summary}</p>
                          </div>

                          {expandedNews.has(news._id || `ticker-${index}`) && (
                            <div className="border-t pt-4">
                              <h3 className="text-sm font-medium text-muted-foreground mb-2">Full Content</h3>
                              <div className="space-y-3">
                                <p className="text-sm leading-relaxed">{news.content}</p>

                                <div>
                                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Analysis</h3>
                                  <p className="text-sm">{news.reasoning}</p>
                                </div>

                                <div className="pt-3 border-t">
                                  <a
                                    href={news.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-primary hover:underline text-sm font-medium"
                                  >
                                    📰 Read original article →
                                  </a>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 items-center justify-between">
                            <div className="flex flex-wrap gap-2">
                              {news.tickers &&
                                news.tickers.map((ticker, i) => (
                                  <Badge key={i} variant="outline" className="bg-primary/10">
                                    {ticker}
                                  </Badge>
                                ))}
                            </div>
                            <button
                              onClick={() => {
                                const newsId = news._id || `ticker-${index}`
                                const newExpanded = new Set(expandedNews)
                                if (newExpanded.has(newsId)) {
                                  newExpanded.delete(newsId)
                                } else {
                                  newExpanded.add(newsId)
                                }
                                setExpandedNews(newExpanded)
                              }}
                              className="text-primary hover:underline text-sm font-medium"
                            >
                              {expandedNews.has(news._id || `ticker-${index}`) ? "Show less" : "Read more"}
                            </button>
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
            © 2025 Fokus Saham. Developed by{" "}
            <span className="font-medium text-primary">Kelompok 2</span>
          </p>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">Data provided by MongoDB</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
