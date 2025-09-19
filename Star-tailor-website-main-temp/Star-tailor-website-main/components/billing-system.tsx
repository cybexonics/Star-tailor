"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, Trash2, Printer, Calculator, Loader2, Pen, Eraser } from "lucide-react"
import { api } from "@/lib/api"

interface Customer {
  _id: string
  name: string
  phone: string
  email?: string
  address: string
  notes?: string
}

interface BillItem {
  id: string
  itemType: string
  description: string
  quantity: number
  rate: number
  sizes: { [key: string]: string }
  total: number
}

interface Bill {
  _id?: string
  billNoStr?: string
  customerId: string
  customerName: string
  customerPhone: string
  customerAddress: string
  items: BillItem[]
  subtotal: number
  discount: number
  total: number
  advance: number
  balance: number
  dueDate: string
  specialInstructions: string
  designImages: string[]
  drawings: string[]
  signature: string
  createdDate: string
  status: string
}

const ITEM_TYPES = [
  { value: "shirt", label: "Shirt", sizes: ["Chest", "Waist", "Length", "Shoulder", "Sleeve"] },
  { value: "trouser", label: "Trouser", sizes: ["Waist", "Length", "Hip", "Thigh", "Bottom"] },
  {
    value: "suit",
    label: "Suit",
    sizes: ["Chest", "Waist", "Length", "Shoulder", "Sleeve", "Trouser Waist", "Trouser Length"],
  },
  { value: "dress", label: "Dress", sizes: ["Bust", "Waist", "Hip", "Length", "Shoulder"] },
  { value: "blouse", label: "Blouse", sizes: ["Bust", "Waist", "Length", "Shoulder", "Sleeve"] },
  { value: "kurta", label: "Kurta", sizes: ["Chest", "Length", "Shoulder", "Sleeve"] },
  { value: "saree_blouse", label: "Saree Blouse", sizes: ["Bust", "Waist", "Length", "Shoulder"] },
]

export function BillingSystem() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>({
    _id: "new",
    name: "",
    phone: "",
    address: "",
  })
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  })
  const [billItems, setBillItems] = useState<BillItem[]>([
    {
      id: "1",
      itemType: "",
      description: "",
      quantity: 1,
      rate: 0,
      sizes: {},
      total: 0,
    },
  ])
  const [discount, setDiscount] = useState(0)
  const [advance, setAdvance] = useState(0)
  const [dueDate, setDueDate] = useState("")
  const [specialInstructions, setSpecialInstructions] = useState("")
  const [designImages, setDesignImages] = useState<string[]>([])
  const [drawings, setDrawings] = useState<string[]>([])
  const [signature, setSignature] = useState("")
  const [currentBill, setCurrentBill] = useState<Bill | null>(null)
  const [showBillPreview, setShowBillPreview] = useState(false)
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [isSignatureMode, setIsSignatureMode] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingColor, setDrawingColor] = useState("#000000")
  const [drawingWidth, setDrawingWidth] = useState(2)
  const [compactMode] = useState(true)
  const [upiId, setUpiId] = useState("startailors@paytm")
  const [businessName, setBusinessName] = useState("STAR TAILORS")
  const [businessAddress, setBusinessAddress] = useState("Baramati, Maharashtra")
  const [loading, setLoading] = useState(false)
  const [customersLoading, setCustomersLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null)
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null)

  const resetForm = () => {
    setSelectedCustomer({ _id: "new", name: "", phone: "", address: "" } as any)
    setNewCustomer({ name: "", phone: "", email: "", address: "", notes: "" })
    setBillItems([
      {
        id: "1",
        itemType: "",
        description: "",
        quantity: 1,
        rate: 0,
        sizes: {},
        total: 0,
      },
    ])
    setDiscount(0)
    setAdvance(0)
    setDueDate("")
    setSpecialInstructions("")
    setDesignImages([])
    setDrawings([])
    setSignature("")
    setCurrentBill(null)
    setShowBillPreview(false)
    // Smooth UX: scroll to top and soft refresh
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    try { (router as any).refresh?.() } catch {}
  }

  useEffect(() => {
    loadCustomers()
    loadUpiSettings()
    loadBusinessInfo()
  }, [])

  const loadCustomers = async () => {
    try {
      setCustomersLoading(true)
      const response = await api.customers.getAll()
      setCustomers(response.customers || [])
    } catch (error) {
      console.error("Error loading customers:", error)
      toast({
        title: "Error",
        description: "Failed to load customers. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCustomersLoading(false)
    }
  }

  const loadUpiSettings = async () => {
    try {
      const settings = await api.settings.getUpi()
      const value = settings.upi_id || settings.upiId
      if (value) {
        setUpiId(value)
      }
    } catch (error) {
      const savedUpiId = localStorage.getItem("adminUpiId")
      if (savedUpiId) {
        setUpiId(savedUpiId)
      }
    }
  }

  const loadBusinessInfo = async () => {
    try {
      const res = await api.settings.getBusiness()
      if (res.business_name) setBusinessName(res.business_name)
      if (res.address) setBusinessAddress(res.address)
    } catch (e) {
      // ignore, keep defaults
    }
  }

  const addBillItem = () => {
    const newItem: BillItem = {
      id: Date.now().toString(),
      itemType: "",
      description: "",
      quantity: 1,
      rate: 0,
      sizes: {},
      total: 0,
    }
    setBillItems([...billItems, newItem])
  }

  const updateBillItem = (id: string, field: string, value: any) => {
    setBillItems(
      billItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }
          if (field === "quantity" || field === "rate") {
            updatedItem.total = updatedItem.quantity * updatedItem.rate
          }
          return updatedItem
        }
        return item
      }),
    )
  }

  const removeBillItem = (id: string) => {
    if (billItems.length > 1) {
      setBillItems(billItems.filter((item) => item.id !== id))
    }
  }

const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = event.target.files
  if (!files || files.length === 0) return

  // Convert to persistent base64 data URLs so they render in Workflow after reload
  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string) || "")
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const dataUrls: string[] = []
  for (const f of Array.from(files)) {
    try {
      const url = await toDataUrl(f)
      dataUrls.push(url)
    } catch (e) {
      console.error("Failed to read image", e)
    }
  }
  if (dataUrls.length > 0) {
    setDesignImages((prev) => [...prev, ...dataUrls])
  }
}

  const calculateSubtotal = () => {
    return billItems.reduce((sum, item) => sum + item.total, 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    return subtotal - discount
  }

  const calculateBalance = () => {
    return calculateTotal() - advance
  }

  const generateBill = async () => {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
      toast({
        title: "Error",
        description: "Name and phone are required fields for customer.",
        variant: "destructive",
      })
      return
    }

    if (billItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the bill.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      // Create customer first
      const customerData = {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        email: newCustomer.email.trim(),
        address: newCustomer.address.trim(),
        notes: newCustomer.notes.trim(),
      }

      console.log("Creating customer with data:", customerData)

      const customerResponse = await api.customers.create(customerData)
      const customerId = customerResponse._id || customerResponse.customer?._id

      console.log("Customer created with ID:", customerId)

      if (!customerId) {
        throw new Error("Customer ID not returned from server")
      }

      // Create bill with the new customer ID
      const billData = {
        customer_id: customerId,
        customer_name: newCustomer.name,
        customer_phone: newCustomer.phone,
        customer_address: newCustomer.address,
        items: billItems.map((item) => ({
          type: item.itemType,
          description: item.description || "",
          quantity: Number(item.quantity) || 1,
          price: Number(item.rate) || 0,
          measurements: item.sizes || {},
          total: Number(item.total) || 0,
        })),
        subtotal: Number(calculateSubtotal()) || 0,
        discount: Number(discount) || 0,
        total: Number(calculateTotal()) || 0,
        advance: Number(advance) || 0,
        balance: Number(calculateBalance()) || 0,
        due_date: dueDate || "",
        special_instructions: specialInstructions || "",
        design_images: designImages || [],
        drawings: drawings || [],
        signature: signature || "",
        status: "pending",
      }

      console.log("Creating bill with data:", billData)

      const billResponse = await api.bills.create(billData)

      const created = billResponse.bill || billResponse
      const billNoStr = created?.bill_no_str || created?.billNoStr || (created?.bill_no != null ? String(created.bill_no).padStart(3, "0") : undefined)

      const bill: Bill = {
        _id: created?._id || billResponse._id,
        billNoStr: billNoStr,
        customerId: customerId,
        customerName: newCustomer.name,
        customerPhone: newCustomer.phone,
        customerAddress: newCustomer.address,
        items: billItems,
        subtotal: calculateSubtotal(),
        discount,
        total: calculateTotal(),
        advance,
        balance: calculateBalance(),
        dueDate,
        specialInstructions,
        designImages,
        drawings,
        signature,
        createdDate: new Date().toISOString().split("T")[0],
        status: "pending",
      }

      setCurrentBill(bill)
      setShowBillPreview(true)

      // Refresh customers list
      await loadCustomers()

      toast({
        title: "Bill Generated",
        description: "Customer added and bill generated successfully! You can print or create a new bill.",
      })
    } catch (error: any) {
      console.error("Error generating bill:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate bill. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = (amount: number) => {
    const merchantName = businessName || "STAR TAILORS"
    const upiString = `upi://pay?pa=${upiId}&pn=${merchantName}&am=${amount}&cu=INR`
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`
    return qrCodeUrl
  }

  const printBill = () => {
    // Ensure we only print the bill content and prevent multiple prints
    try {
      // Focus on the dialog content for printing
      const billContent = document.getElementById('bill-content')
      if (billContent) {
        // Create a new window/frame for clean printing
        const printWindow = window.open('', '_blank', 'width=800,height=600')
        if (printWindow) {
          // Copy the bill content to the new window
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Bill - ${currentBill?.billNoStr || 'Draft'}</title>
              <style>
                @page {
                  size: A4;
                  margin: 0.5in;
                }
                body {
                  font-family: Arial, sans-serif;
                  font-size: 12pt;
                  line-height: 1.4;
                  color: #000;
                  margin: 0;
                  padding: 0;
                }
                table {
                  border-collapse: collapse;
                  width: 100%;
                  margin: 1rem 0;
                }
                th, td {
                  border: 1px solid #000;
                  padding: 8px;
                  text-align: left;
                }
                th {
                  background-color: #f5f5f5;
                  font-weight: bold;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .amount-display {
                  font-weight: bold;
                  color: #000;
                }
                .qr-code {
                  width: 100px;
                  height: 100px;
                }
                .space-y-6 > * + * { margin-top: 1.5rem; }
                .space-y-4 > * + * { margin-top: 1rem; }
                .space-y-2 > * + * { margin-top: 0.5rem; }
                .border-t { border-top: 1px solid #000; }
                .pt-4 { padding-top: 1rem; }
                .mt-4 { margin-top: 1rem; }
                .mb-2 { margin-bottom: 0.5rem; }
              </style>
            </head>
            <body>
              ${billContent.innerHTML}
            </body>
            </html>
          `)
          printWindow.document.close()
          printWindow.focus()
          
          // Wait for content to load, then print
          setTimeout(() => {
            printWindow.print()
            printWindow.close()
          }, 500)
        } else {
          // Fallback to regular window print
          window.print()
        }
      } else {
        // Fallback to regular window print
        window.print()
      }
    } catch (error) {
      console.error('Print error:', error)
      // Fallback to regular window print
      window.print()
    }
  }

  // Drawing functions
  const startDrawing = (e: React.MouseEvent, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.strokeStyle = drawingColor
    ctx.lineWidth = drawingWidth
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  // Touch events for mobile devices
  const startDrawingTouch = (e: React.TouchEvent, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0]
    ctx.beginPath()
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top)
    setIsDrawing(true)
    e.preventDefault()
  }

  const drawTouch = (e: React.TouchEvent, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.strokeStyle = drawingColor
    ctx.lineWidth = drawingWidth
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0]
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top)
    ctx.stroke()
    e.preventDefault()
  }

  const clearCanvas = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const saveDrawing = () => {
    if (!drawingCanvasRef.current) return

    const canvas = drawingCanvasRef.current
    const dataUrl = canvas.toDataURL("image/png")
    setDrawings([...drawings, dataUrl])
    clearCanvas(drawingCanvasRef)
    setIsDrawingMode(false)
  }

  const saveSignature = () => {
    if (!signatureCanvasRef.current) return

    const canvas = signatureCanvasRef.current
    const dataUrl = canvas.toDataURL("image/png")
    setSignature(dataUrl)
    clearCanvas(signatureCanvasRef)
    setIsSignatureMode(false)
  }

  // Initialize canvas context when mode changes
  useEffect(() => {
    if (isDrawingMode && drawingCanvasRef.current) {
      const canvas = drawingCanvasRef.current
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.strokeStyle = drawingColor
        ctx.lineWidth = drawingWidth
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
      }
    }

    if (isSignatureMode && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 2
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
      }
    }
  }, [isDrawingMode, isSignatureMode, drawingColor, drawingWidth]);

  return (<div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 overflow-hidden">
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-violet-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center py-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.back()} className="border-violet-200 hover:bg-violet-50">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push("/admin")} className="hover:bg-violet-50">
                  Admin Dashboard
                </Button>
                <h1 className="text-xl font-semibold text-gray-900 ml-2">Billing System</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                  className="border-violet-200 hover:bg-violet-50"
                  disabled={loading}
                >
                  Reset
                </Button>
                <Button
                  onClick={generateBill}
                  disabled={loading}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
                  Generate & Preview
                </Button>
              </div>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 overflow-hidden">
        {compactMode && (
          <div className="grid grid-cols-1 gap-4">
            <Card className="bg-white/80 backdrop-blur border-violet-100 shadow-md">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-violet-900">Billing Department</CardTitle>
                  <CardDescription>New Order</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Customer Name *</Label>
                    <Input
                      placeholder="Customer Name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      placeholder="Phone Number"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label>Select Type *</Label>
                    <Select
                      value={billItems[0]?.itemType}
                      onValueChange={(value) => updateBillItem(billItems[0].id, "itemType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEM_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={billItems[0]?.quantity ?? 1}
                      onChange={(e) => updateBillItem(billItems[0].id, "quantity", Number.parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label>Rate *</Label>
                    <Input
                      type="number"
                      min={0}
                      value={billItems[0]?.rate ?? 0}
                      onChange={(e) => updateBillItem(billItems[0].id, "rate", Number.parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Advance</Label>
                    <Input
                      type="number"
                      min={0}
                      value={advance}
                      onChange={(e) => setAdvance(Number.parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-violet-900 mb-2">Measurements (inches)</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["Length","Shoulder","Sleeve","Chest","Waist","Hips","Front Neck","Back Neck"].map((label) => (
                      <div key={label}>
                        <Label className="text-xs">{label}</Label>
                        <Input
                          placeholder={label}
                          value={billItems[0]?.sizes?.[label] || ""}
                          onChange={(e) =>
                            updateBillItem(billItems[0].id, "sizes", { ...(billItems[0]?.sizes || {}), [label]: e.target.value })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Images</Label>
                    <div className="border border-dashed border-violet-200 rounded-md p-4 text-center bg-white">
                      <Input id="compact-images" type="file" multiple accept="image/*" onChange={handleImageUpload} className="cursor-pointer" />
                      <p className="text-xs text-muted-foreground mt-2">Drop images, click to browse, or Ctrl+V</p>
                    </div>
                  </div>
                  <div>
                    <Label>Drawing</Label>
                    <div className="flex items-center gap-2 text-sm my-2">
                      <Button size="sm" variant={isDrawingMode ? "default" : "outline"} onClick={() => setIsDrawingMode(true)}>Pen</Button>
                      <Button size="sm" variant="outline" onClick={() => clearCanvas(drawingCanvasRef)}>Eraser</Button>
                      <Input type="color" value={drawingColor} onChange={(e) => setDrawingColor(e.target.value)} className="w-8 h-8 p-0" />
                      <Select value={drawingWidth.toString()} onValueChange={(v) => setDrawingWidth(Number.parseInt(v))}>
                        <SelectTrigger className="w-16 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1px</SelectItem>
                          <SelectItem value="2">2px</SelectItem>
                          <SelectItem value="4">4px</SelectItem>
                          <SelectItem value="6">6px</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => clearCanvas(drawingCanvasRef)}>Clear</Button>
                    </div>
                    <div className="border rounded bg-white p-2">
                      <canvas
                        ref={drawingCanvasRef}
                        width={520}
                        height={220}
                        className="border rounded w-full"
                        onMouseDown={(e) => startDrawing(e, drawingCanvasRef)}
                        onMouseMove={(e) => draw(e, drawingCanvasRef)}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={(e) => startDrawingTouch(e, drawingCanvasRef)}
                        onTouchMove={(e) => drawTouch(e, drawingCanvasRef)}
                        onTouchEnd={stopDrawing}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={resetForm}>Reset</Button>
                  <Button className="bg-gradient-to-r from-violet-600 to-indigo-600" onClick={generateBill}>Generate & Preview</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!compactMode && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information Card */}
            <Card className="bg-white/70 backdrop-blur-sm border-violet-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-t-lg py-3">
                <CardTitle className="text-violet-900">Customer Information</CardTitle>
                <CardDescription>Enter customer details for billing</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="p-4 border border-violet-200 rounded-lg bg-violet-50/50">
                    <h3 className="font-medium text-violet-900 mb-4">Customer Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                          placeholder="Enter customer name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newCustomer.email}
                          onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={newCustomer.address}
                          onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                          placeholder="Enter customer address"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={newCustomer.notes}
                          onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                          placeholder="Any special preferences or notes"
                          rows={1}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bill Items Card */}
            <Card className="bg-white/70 backdrop-blur-sm border-violet-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-t-lg py-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-violet-900">Bill Items</CardTitle>
                    <CardDescription>Add items and measurements</CardDescription>
                  </div>
                  <Button
                    onClick={addBillItem}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {billItems.map((item, index) => {
                    const itemType = ITEM_TYPES.find((type) => type.value === item.itemType)
                    return (
                      <div
                        key={item.id}
                        className="p-3 border border-violet-100 rounded-lg space-y-3 bg-gradient-to-r from-violet-25 to-indigo-25"
                      >
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-violet-900">Item {index + 1}</h4>
                          {billItems.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeBillItem(item.id)}
                              className="border-red-200 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label>Item Type</Label>
                            <Select
                              value={item.itemType}
                              onValueChange={(value: string) => updateBillItem(item.id, "itemType", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select item type" />
                              </SelectTrigger>
                              <SelectContent>
                                {ITEM_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) => updateBillItem(item.id, "description", e.target.value)}
                              placeholder="Item description"
                            />
                          </div>
                        </div>

                        {itemType && (
                          <div>
                            <Label className="text-sm font-medium">Measurements</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                              {itemType.sizes.map((size) => (
                                <div key={size}>
                                  <Label className="text-xs">{size}</Label>
                                  <Input
                                    placeholder="Size"
                                    value={item.sizes[size] || ""}
                                    onChange={(e) =>
                                      updateBillItem(item.id, "sizes", { ...item.sizes, [size]: e.target.value })
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateBillItem(item.id, "quantity", Number.parseInt(e.target.value) || 0)
                              }
                              min="1"
                            />
                          </div>
                          <div>
                            <Label>Rate (₹)</Label>
                            <Input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateBillItem(item.id, "rate", Number.parseFloat(e.target.value) || 0)}
                              min="0"
                            />
                          </div>
                          <div>
                            <Label>Total (₹)</Label>
                            <Input value={item.total.toFixed(2)} readOnly className="bg-violet-50" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Optional sections collapsed to fit single screen */}
            <Accordion type="multiple" className="col-span-2 lg:col-span-2" defaultValue={[]}>
              <AccordionItem value="design-images">
                <AccordionTrigger className="text-violet-900">Design Images</AccordionTrigger>
                <AccordionContent>
            <Card className="bg-white/70 backdrop-blur-sm border-violet-100 shadow-lg">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                  <div>
                    <Label htmlFor="images">Upload Images</Label>
                    <Input
                      id="images"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="cursor-pointer"
                    />
                  </div>
                  {designImages.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {designImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image || "/placeholder.svg"}
                            alt={`Design ${index + 1}`}
                            className="w-full h-24 object-cover rounded border border-violet-100"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-6 w-6 p-0"
                            onClick={() => setDesignImages(designImages.filter((_, i) => i !== index))}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="design-drawing">
                <AccordionTrigger className="text-violet-900">Design Drawing</AccordionTrigger>
                <AccordionContent>
            <Card className="bg-white/70 backdrop-blur-sm border-violet-100 shadow-lg">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                  {!isDrawingMode ? (
                          <div className="flex flex-col gap-3">
                      <Button
                        onClick={() => setIsDrawingMode(true)}
                        variant="outline"
                        className="border-violet-200 hover:bg-violet-50"
                      >
                        <Pen className="h-4 w-4 mr-2" />
                        Start Drawing
                      </Button>
                      {drawings.length > 0 && (
                        <div>
                          <h4 className="font-medium text-violet-900 mb-2">Saved Drawings</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {drawings.map((drawing, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={drawing || "/placeholder.svg"}
                                  alt={`Drawing ${index + 1}`}
                                  className="w-full h-24 object-contain rounded border border-violet-100 bg-white"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-1 right-1 h-6 w-6 p-0"
                                  onClick={() => setDrawings(drawings.filter((_, i) => i !== index))}
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                          <div className="space-y-3">
                      <div className="flex gap-2 items-center">
                        <Label htmlFor="drawingColor">Color:</Label>
                              <Input id="drawingColor" type="color" value={drawingColor} onChange={(e) => setDrawingColor(e.target.value)} className="w-10 h-10 p-1" />
                              <Label htmlFor="drawingWidth" className="ml-2">Width:</Label>
                              <Select value={drawingWidth.toString()} onValueChange={(value) => setDrawingWidth(Number.parseInt(value))}>
                                <SelectTrigger className="w-20"><SelectValue placeholder="Width" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Thin</SelectItem>
                            <SelectItem value="2">Medium</SelectItem>
                            <SelectItem value="4">Thick</SelectItem>
                            <SelectItem value="6">Extra Thick</SelectItem>
                          </SelectContent>
                        </Select>
                              <Button variant="outline" onClick={() => clearCanvas(drawingCanvasRef)} className="ml-auto border-red-200 hover:bg-red-50">
                          <Eraser className="h-4 w-4 mr-2" />
                          Clear
                        </Button>
                      </div>
                      <div className="border rounded-lg p-2 bg-white">
                        <canvas
                          ref={drawingCanvasRef}
                          width={500}
                                height={240}
                          className="border rounded bg-white w-full"
                          onMouseDown={(e) => startDrawing(e, drawingCanvasRef)}
                          onMouseMove={(e) => draw(e, drawingCanvasRef)}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={(e) => startDrawingTouch(e, drawingCanvasRef)}
                          onTouchMove={(e) => drawTouch(e, drawingCanvasRef)}
                          onTouchEnd={stopDrawing}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => setIsDrawingMode(false)}>Cancel</Button>
                              <Button onClick={saveDrawing} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">Save Drawing</Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="signature">
                <AccordionTrigger className="text-violet-900">Customer Signature</AccordionTrigger>
                <AccordionContent>
            <Card className="bg-white/70 backdrop-blur-sm border-violet-100 shadow-lg">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                  {!isSignatureMode ? (
                          <div className="flex flex-col gap-3">
                            <Button onClick={() => setIsSignatureMode(true)} variant="outline" className="border-violet-200 hover:bg-violet-50">
                              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        Add Signature
                      </Button>
                      {signature && (
                        <div>
                          <h4 className="font-medium text-violet-900 mb-2">Customer Signature</h4>
                          <div className="relative inline-block">
                                  <img src={signature || "/placeholder.svg"} alt="Customer Signature" className="w-48 h-24 object-contain rounded border border-violet-100 bg-white" />
                                  <Button variant="destructive" size="sm" className="absolute top-1 right-1 h-6 w-6 p-0" onClick={() => setSignature("")}>×</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                          <div className="space-y-3">
                      <div className="flex justify-end">
                              <Button variant="outline" onClick={() => clearCanvas(signatureCanvasRef)} className="border-red-200 hover:bg-red-50">
                          <Eraser className="h-4 w-4 mr-2" />
                          Clear
                        </Button>
                      </div>
                      <div className="border rounded-lg p-2 bg-white">
                        <canvas
                          ref={signatureCanvasRef}
                          width={500}
                                height={160}
                          className="border rounded bg-white w-full"
                          onMouseDown={(e) => startDrawing(e, signatureCanvasRef)}
                          onMouseMove={(e) => draw(e, signatureCanvasRef)}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={(e) => startDrawingTouch(e, signatureCanvasRef)}
                          onTouchMove={(e) => drawTouch(e, signatureCanvasRef)}
                          onTouchEnd={stopDrawing}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => setIsSignatureMode(false)}>Cancel</Button>
                              <Button onClick={saveSignature} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">Save Signature</Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="instructions">
                <AccordionTrigger className="text-violet-900">Special Instructions</AccordionTrigger>
                <AccordionContent>
            <Card className="bg-white/70 backdrop-blur-sm border-violet-100 shadow-lg">
                    <CardContent className="p-4">
                      <Textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} placeholder="Enter special instructions for the tailor..." rows={2} />
              </CardContent>
            </Card>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Bill Summary Card */}
          <div className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-violet-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-t-lg">
                <CardTitle className="text-violet-900">Bill Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div>
                  <Label htmlFor="discount">Discount (₹)</Label>
                  <Input
                    id="discount"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number.parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>₹{calculateTotal().toFixed(2)}</span>
                </div>
                <div>
                  <Label htmlFor="advance">Advance Paid (₹)</Label>
                  <Input
                    id="advance"
                    type="number"
                    value={advance}
                    onChange={(e) => setAdvance(Number.parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Balance:</span>
                  <span className={calculateBalance() > 0 ? "text-red-600" : "text-green-600"}>
                    ₹{calculateBalance().toFixed(2)}
                  </span>
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>

                {calculateBalance() > 0 && (
                  <div className="border-t border-violet-100 pt-4 mt-4">
                    <div className="text-center">
                      <h3 className="font-medium mb-3 text-sm text-violet-900">Payment QR Code</h3>
                      <div className="bg-white p-3 rounded-lg border border-violet-100 inline-block">
                        <img
                          src={generateQRCode(calculateBalance()) || "/placeholder.svg"}
                          alt="Payment QR Code"
                          className="w-24 h-24 mx-auto"
                        />
                      </div>
                      <div className="mt-2 text-xs text-violet-700 space-y-1">
                        <div>
                          <strong>Amount:</strong> ₹{calculateBalance().toFixed(2)}
                        </div>
                        <div>
                          <strong>UPI ID:</strong> {upiId}
                        </div>
                        <div className="text-violet-600">Scan to pay balance</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        )}

        {/* Bill Preview Dialog */}
        <Dialog open={showBillPreview} onOpenChange={setShowBillPreview}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bill Preview</DialogTitle>
                <DialogDescription>Review and print the bill</DialogDescription>
              </DialogHeader>
              {/* Enhanced Print styles for better bill printing */}
              <style>{`
                @media print {
                  @page {
                    size: A4;
                    margin: 0.5in;
                  }
                  
                  body { 
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                    font-size: 12pt;
                  }
                  
                  .print\:hidden { 
                    display: none !important; 
                  }
                  
                  .print\:block { 
                    display: block !important; 
                  }
                  
                  .print\:mt-0 { 
                    margin-top: 0 !important; 
                  }
                  
                  .print\:pt-0 { 
                    padding-top: 0 !important; 
                  }
                  
                  .print\:text-black {
                    color: #000 !important;
                  }
                  
                  .print\:border-black {
                    border-color: #000 !important;
                  }
                  
                  table { 
                    page-break-inside: auto;
                    border-collapse: collapse !important;
                  }
                  
                  tr { 
                    page-break-inside: avoid; 
                    page-break-after: auto;
                  }
                  
                  th, td {
                    border: 1px solid #000 !important;
                    padding: 8px !important;
                    font-size: 11pt !important;
                  }
                  
                  .bill-content {
                    max-width: none !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  
                  .amount-display {
                    font-weight: bold !important;
                    color: #000 !important;
                    font-size: 12pt !important;
                  }
                  
                  .qr-code {
                    width: 100px !important;
                    height: 100px !important;
                  }
                  
                  /* Hide dialog decorations when printing */
                  [role="dialog"], .fixed, .absolute {
                    position: static !important;
                  }
                  
                  /* Ensure proper spacing */
                  .space-y-6 > * + * {
                    margin-top: 1.5rem !important;
                  }
                  
                  .space-y-4 > * + * {
                    margin-top: 1rem !important;
                  }
                  
                  .space-y-2 > * + * {
                    margin-top: 0.5rem !important;
                  }
                }
              `}</style>
              {currentBill && (
                <div className="bill-content print:text-black" id="bill-content">
                  {/* Two-copy layout */}
                  <div className="border border-gray-300 print:border-black">
                    <div className="grid grid-cols-2 divide-x divide-gray-300 print:divide-black">
                      {/* Tailor Copy (Left) */}
                      <div className="p-3">
                        <div className="text-center border-b pb-2 mb-2">
                          <h2 className="text-xl font-bold">{businessName || "STAR TAILOR"}</h2>
                          <p className="text-xs">EXCLUSIVE LADIES & CUSTOM TAILOR</p>
                          <p className="text-xs">{businessAddress}</p>
                </div>

                        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                          <div className="border p-2 text-center">
                            <div className="font-semibold">{currentBill.billNoStr || currentBill._id}</div>
                            <div className="text-[10px]">Bill No</div>
                    </div>
                          <div className="border p-2 text-center">
                            <div className="font-semibold">{new Date(currentBill.createdDate).toLocaleDateString()}</div>
                            <div className="text-[10px]">Date</div>
                    </div>
                          <div className="border p-2 text-center">
                            <div className="font-semibold">{currentBill.items.reduce((s,i)=>s+(Number(i.quantity)||0),0)}</div>
                            <div className="text-[10px]">Qty</div>
                    </div>
                  </div>

                        <div className="border p-2 text-sm mb-2">{currentBill.customerName}</div>
                        <div className="border p-2 text-sm mb-3">{ITEM_TYPES.find(t=>t.value===currentBill.items[0]?.itemType)?.label || ""}<span className="text-xs ml-1">Cloth Type</span></div>

                        <div className="border p-2 mb-2">
                          <div className="font-semibold text-xs mb-1">MEASUREMENTS</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {(["Length","Shoulder","Sleeve","Chest","Waist","Hips","Front Neck","Back Neck"] as string[]).map((k)=>{
                              const v = currentBill.items[0]?.sizes?.[k]
                              return (
                                <div key={k} className="flex justify-between">
                                  <span>{k}:</span>
                                  <span className="font-medium">{v || "-"}</span>
                    </div>
                              )
                            })}
                    </div>
                    </div>

                        <div className="border p-2 mb-2">
                          <div className="font-semibold text-xs mb-1">TAILOR NOTES:</div>
                          <div className="text-xs min-h-[48px]">
                            {currentBill.specialInstructions || "____________________________\n____________________________"}
                  </div>
                </div>

                        {currentBill.designImages.length > 0 && (
                          <div className="border p-2 mb-2">
                            <div className="font-semibold text-xs mb-1">DESIGN IMAGES</div>
                            <div className="grid grid-cols-3 gap-2">
                              {currentBill.designImages.slice(0,3).map((img,idx)=> (
                                <img key={idx} src={img || "/placeholder.svg"} alt={`Design ${idx+1}`} className="h-20 object-contain border" />
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="text-center text-[10px] mt-2">
                          TAILOR MANAGEMENT COPY
                        </div>
                      </div>

                      {/* Customer Copy (Right) */}
                      <div className="p-3">
                        <div className="text-center border-b pb-2 mb-2">
                          <h2 className="text-xl font-bold">{businessName || "STAR TAILOR"}</h2>
                          <p className="text-xs">EXCLUSIVE LADIES & CUSTOM TAILOR</p>
                          <p className="text-xs">{businessAddress}</p>
                          <div className="mt-1 text-right text-xs">CASH MEMO<br/>Bill No - <span className="font-semibold">{currentBill.billNoStr || currentBill._id}</span></div>
                        </div>

                        <div className="text-xs border p-2 mb-2">Name - {currentBill.customerName}</div>

                        <table className="w-full border text-xs mb-2">
                    <thead>
                            <tr className="bg-gray-100">
                              <th className="border p-1">Sr.No.</th>
                              <th className="border p-1 text-left">Description</th>
                              <th className="border p-1">Qty</th>
                              <th className="border p-1">Rate</th>
                              <th className="border p-1">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                            {currentBill.items.map((item,idx)=> (
                              <tr key={idx}>
                                <td className="border p-1 text-center">{idx+1}</td>
                                <td className="border p-1">{item.description || ITEM_TYPES.find(t=>t.value===item.itemType)?.label}</td>
                                <td className="border p-1 text-center">{item.quantity}</td>
                                <td className="border p-1 text-right">₹{item.rate.toFixed(0)}</td>
                                <td className="border p-1 text-right">₹{item.total.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                        <div className="text-xs mb-2 space-y-1 w-52 ml-auto">
                          <div className="flex justify-between"><span>Total:</span><span className="font-semibold">₹{currentBill.total.toFixed(2)}</span></div>
                          <div className="flex justify-between"><span>Advance:</span><span className="text-green-700 font-semibold">₹{currentBill.advance.toFixed(2)}</span></div>
                          <div className="flex justify-between"><span>Balance:</span><span className="text-red-700 font-bold">₹{currentBill.balance.toFixed(2)}</span></div>
                </div>

                {currentBill.designImages.length > 0 && (
                          <div className="border p-2 mb-2">
                            <div className="font-semibold text-xs mb-1">DESIGN IMAGES</div>
                            <div className="grid grid-cols-3 gap-2">
                              {currentBill.designImages.slice(0,3).map((img,idx)=> (
                                <img key={idx} src={img || "/placeholder.svg"} alt={`Design ${idx+1}`} className="h-20 object-contain border" />
                      ))}
                    </div>
                  </div>
                )}

                        {currentBill.balance > 0 && (
                          <div className="border p-3 mb-2">
                            <div className="text-center text-xs mb-2">Scan to Pay Balance Amount</div>
                            <div className="flex items-center justify-center">
                              <img src={generateQRCode(currentBill.balance) || "/placeholder.svg"} alt="Payment QR Code" className="w-28 h-28 border" />
                        </div>
                            <div className="text-center text-xs mt-2">
                              <div className="font-semibold">UPI Payment</div>
                              <div>₹{currentBill.balance.toFixed(2)}</div>
                              <div>UPI: {upiId}</div>
                              <div>Order #{currentBill.billNoStr || currentBill._id}</div>
                    </div>
                  </div>
                )}

                        <div className="text-center text-[10px] mt-2">
                          CUSTOMER COPY
                  </div>
                      </div>
                        </div>
                    <div className="text-center text-[10px] text-gray-500 border-t py-1">CUT ALONG THIS LINE</div>
                        </div>

                  {/* Actions (not printed) */}
                  <div className="flex justify-center space-x-3 mt-3 print:hidden">
                    <Button onClick={printBill} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
                    <Printer className="h-4 w-4 mr-2" />
                    Print Bill
                  </Button>
                  <Button variant="outline" onClick={() => { resetForm(); }}>New Bill</Button>
                    <Button variant="outline" onClick={() => router.push('/admin/workflow')}>Go to Workflow</Button>
                    <Button variant="outline" onClick={() => setShowBillPreview(false)}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>)
}
