"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft, GraduationCap, Plus, Eye, EyeOff, KeyRound, User, Mail, Phone, Shield,
  Briefcase, Award, Clock, IndianRupee, CreditCard, Upload, FileText, Check, AlertCircle, Save
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { DatePicker } from "@/components/ui/DatePicker"
import { FormField } from "@/components/ui/FormField"
import {
  TimeSlotPicker,
  parseTimeSlotsFromStrings,
  timeSlotsToStrings,
  type TimeSlot,
} from "@/components/ui/TimeSlotPicker"
import { useStore } from "@/store/useStore"
import { api, ApiError } from "@/lib/api"
import { useCenterPolicy } from "@/hooks/useCenterPolicy"
import { CapacityLimitNotice, showCapacityLimitToast } from "@/components/shared/CapacityLimitNotice"

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default function RegisterTrainerPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading form...</div>}>
      <RegisterTrainerForm />
    </React.Suspense>
  )
}

function RegisterTrainerForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")
  const isEditMode = !!editId

  const { addNotification, activeTenant, fetchCenterPolicy } = useStore()
  const { policy, atCapacity } = useCenterPolicy()
  const trainersAtCapacity = !isEditMode && atCapacity("trainers")

  // Form states - Personal
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")

  // Form states - Employment
  const [trainerId, setTrainerId] = React.useState("TRN-XXXX (Auto Generated)")
  const [employmentType, setEmploymentType] = React.useState<"Full Time" | "Part Time" | "Contract" | "Freelancer / External Trainer" | "Guest Lecturer">("Full Time")
  const [joiningDate, setJoiningDate] = React.useState(new Date().toISOString().substring(0, 10))
  const [status, setStatus] = React.useState<"Active" | "Inactive">("Active")

  // Form states - Professional
  const [skills, setSkills] = React.useState("")
  const [experience, setExperience] = React.useState("")
  const [highestQualification, setHighestQualification] = React.useState("")
  const [certifications, setCertifications] = React.useState("")

  // Form states - Login Access
  const [createAccount, setCreateAccount] = React.useState(false)
  const [username, setUsername] = React.useState("")
  const [temporaryPassword, setTemporaryPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)

  // Form states - Training
  const [technologySubject, setTechnologySubject] = React.useState("")
  const [trainingMode, setTrainingMode] = React.useState<"Online" | "Offline" | "Hybrid">("Offline")
  const [selectedDays, setSelectedDays] = React.useState<string[]>([])
  const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([{ start: "10:00", end: "12:00" }])
  const [usernameManuallyEdited, setUsernameManuallyEdited] = React.useState(false)

  // Form states - Payment
  const [paymentModel, setPaymentModel] = React.useState<"Monthly Salary" | "Per Hour" | "Per Session" | "Per Batch">("Monthly Salary")
  const [salaryRateAmount, setSalaryRateAmount] = React.useState("")
  const [bankHolderName, setBankHolderName] = React.useState("")
  const [bankAccountNumber, setBankAccountNumber] = React.useState("")
  const [ifscCode, setIfscCode] = React.useState("")
  const [upiId, setUpiId] = React.useState("")
  const [panNumber, setPanNumber] = React.useState("")

  // Form states - Documents (Mock upload filename tracking)
  const [resumeFile, setResumeFile] = React.useState<string>("")
  const [idProofFile, setIdProofFile] = React.useState<string>("")
  const [certificationsFile, setCertificationsFile] = React.useState<string>("")

  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")

  // Fetch trainer details if in edit mode
  React.useEffect(() => {
    if (!editId) return

    const loadTrainerData = async () => {
      try {
        const data = await api.getTrainerById(editId)
        setName(data.name || "")
        setEmail(data.email || "")
        setPhone(data.phone || "")
        setTrainerId(data.trainerId || "TRN-XXXX")
        setEmploymentType(data.employmentType || "Full Time")
        if (data.joiningDate) {
          setJoiningDate(new Date(data.joiningDate).toISOString().substring(0, 10))
        }
        setStatus(data.status || "Active")
        setSkills(data.skills || "")
        setExperience(data.experience ? String(data.experience) : "")
        setHighestQualification(data.highestQualification || "")
        setCertifications(data.certifications || "")
        setCreateAccount(data.createAccount || false)
        if (data.username) setUsername(data.username)
        setTechnologySubject(data.technologySubject || "")
        setTrainingMode(data.trainingMode || "Offline")
        setSelectedDays(data.availableDays || [])
        if (data.availableTimeSlots?.length) {
          setTimeSlots(parseTimeSlotsFromStrings(data.availableTimeSlots))
        }
        setPaymentModel(data.paymentModel || "Monthly Salary")
        setSalaryRateAmount(data.salaryRateAmount ? String(data.salaryRateAmount) : "")
        setBankHolderName(data.bankHolderName || "")
        setBankAccountNumber(data.bankAccountNumber || "")
        setIfscCode(data.ifscCode || "")
        setUpiId(data.upiId || "")
        setPanNumber(data.panNumber || "")
        setResumeFile(data.resumeFileName || "")
        setIdProofFile(data.idProofFileName || "")
        setCertificationsFile(data.certificationsFileName || "")
      } catch (err: any) {
        console.error("Failed to load trainer details:", err)
        setError("Failed to fetch trainer profile details.")
      }
    }

    loadTrainerData()
  }, [editId])

  // Sync username with email until manually edited
  React.useEffect(() => {
    if (isEditMode || usernameManuallyEdited || !createAccount) return
    setUsername(email)
  }, [email, createAccount, isEditMode, usernameManuallyEdited])

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  // Handle mock file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "resume" | "idProof" | "certs") => {
    if (e.target.files && e.target.files[0]) {
      const fileName = e.target.files[0].name
      if (type === "resume") setResumeFile(fileName)
      if (type === "idProof") setIdProofFile(fileName)
      if (type === "certs") setCertificationsFile(fileName)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name || !email || !phone || !skills || !experience || !technologySubject || !salaryRateAmount || !joiningDate) {
      setError("Please fill in all required fields marked with an asterisk (*).")
      return
    }

    const phoneDigits = phone.replace(/\D/g, "")
    if (phoneDigits.length < 10) {
      setError("Please enter a valid 10-digit phone number.")
      return
    }

    const invalidSlot = timeSlots.find((s) => !s.start || !s.end || s.start >= s.end)
    if (invalidSlot) {
      setError("Each time slot must have a valid start and end time (end must be after start).")
      return
    }

    if (!isEditMode && createAccount && (!username || !temporaryPassword)) {
      setError("Username and temporary password are required when creating a login account.")
      return
    }

    if (!isEditMode && createAccount && temporaryPassword.length < 6) {
      setError("Temporary password must be at least 6 characters.")
      return
    }

    setSaving(true)
    try {
      const payload = {
        tenantId: activeTenant?.name || "ERP",
        name,
        email,
        phone,
        employmentType,
        joiningDate: new Date(joiningDate),
        status,
        skills,
        experience: Number(experience),
        highestQualification,
        certifications,
        createAccount,
        username: !isEditMode && createAccount ? username : undefined,
        temporaryPassword: !isEditMode && createAccount ? temporaryPassword : undefined,
        technologySubject,
        trainingMode,
        availableDays: selectedDays,
        availableTimeSlots: timeSlotsToStrings(timeSlots),
        paymentModel,
        salaryRateAmount: Number(salaryRateAmount),
        bankHolderName,
        bankAccountNumber,
        ifscCode,
        upiId,
        panNumber,
        resumeFileName: resumeFile,
        idProofFileName: idProofFile,
        certificationsFileName: certificationsFile,
        // legacy compat
        specialization: technologySubject || skills
      }

      if (isEditMode && editId) {
        await api.updateTrainer(editId, payload)
        addNotification({
          title: "Trainer Profile Updated",
          description: `Changes for "${name}" saved successfully.`,
          type: "admissions"
        })
      } else {
        await api.createTrainer(payload)
        addNotification({
          title: "Trainer Registered",
          description: `"${name}" registered successfully as TRN instructor.`,
          type: "admissions"
        })
      }

      router.push("/trainers")
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isCapacityLimit) {
        showCapacityLimitToast(addNotification, "trainers", policy, err.message)
        void fetchCenterPolicy()
        setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : "Failed to save trainer. Please try again.")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border/40 pb-4">
        <button
          onClick={() => router.push("/trainers")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Faculty Ledger
        </button>
        <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2 mt-1">
          <GraduationCap className="h-6 w-6 text-primary" />
          {isEditMode ? "Edit Faculty Profile" : "Register Faculty Trainer"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isEditMode ? "Update the instructor operational records." : "Fill in the details below to add a new instructor to the system database."}
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {trainersAtCapacity && policy && (
          <CapacityLimitNotice resource="trainers" policy={policy} />
        )}

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-xs text-red-400 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Personal & Login Access */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card: Personal Details */}
          <Card className="bg-card border-border/80">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Personal Details
              </CardTitle>
              <CardDescription className="text-xs">Basic contact information for the trainer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Full Name" required>
                <Input
                  required
                  icon={User}
                  placeholder="e.g. Rajesh Kumar"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="bg-card text-xs h-10 border-border/80"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Email" required>
                  <Input
                    required
                    type="email"
                    icon={Mail}
                    placeholder="trainer@academy.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="bg-card text-xs h-10 border-border/80"
                  />
                </FormField>
                <FormField label="Phone Number" required hint="10-digit mobile number">
                  <Input
                    required
                    type="tel"
                    icon={Phone}
                    placeholder="9876543210"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^\d+\s-]/g, ""))}
                    className="bg-card text-xs h-10 border-border/80"
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Card: Login Access */}
          <Card className="bg-card border-border/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    Login Access
                  </CardTitle>
                  <CardDescription className="text-xs">Create a system login account for this trainer.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-muted-foreground cursor-pointer select-none" htmlFor="create-account-chk">
                    {isEditMode ? "Account Configured" : "Create Account?"}
                  </label>
                  <input
                    id="create-account-chk"
                    type="checkbox"
                    checked={createAccount}
                    disabled={isEditMode}
                    onChange={e => setCreateAccount(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Username (Email)" hint={createAccount ? "Defaults to trainer email" : "Enable Create Account to set login"}>
                <Input
                  icon={Mail}
                  placeholder="email@example.com"
                  value={username}
                  onChange={e => {
                    setUsernameManuallyEdited(true)
                    setUsername(e.target.value)
                  }}
                  disabled={!createAccount || isEditMode}
                  className="bg-card text-xs h-10 border-border/80 disabled:opacity-50"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Temporary Password">
                  <div className="relative">
                    <Input
                      icon={Shield}
                      type={showPassword ? "text" : "password"}
                      placeholder={isEditMode ? "••••••••" : "Min 6 characters"}
                      value={temporaryPassword}
                      onChange={e => setTemporaryPassword(e.target.value)}
                      disabled={!createAccount || isEditMode}
                      className="bg-card text-xs h-10 border-border/80 pr-10 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      disabled={!createAccount || isEditMode}
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </FormField>
                <FormField label="Role">
                  <Select
                    value="Trainer"
                    disabled
                    className="bg-card text-xs h-10 border-border/80 opacity-70"
                  >
                    <option value="Trainer">Trainer Faculty</option>
                  </Select>
                </FormField>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Employment & Professional Details */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card: Employment Details */}
          <Card className="bg-card border-border/80">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                Employment Details
              </CardTitle>
              <CardDescription className="text-xs">Contract terms and status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Trainer ID">
                  <Input
                    value={trainerId}
                    disabled
                    className="bg-card text-xs h-10 border-border/80 opacity-70 font-mono"
                  />
                </FormField>
                <FormField label="Employment Type" required>
                  <Select
                    value={employmentType}
                    onChange={e => setEmploymentType(e.target.value as typeof employmentType)}
                    className="bg-card text-xs h-10 border-border/80"
                  >
                    <option value="Full Time">Full Time</option>
                    <option value="Part Time">Part Time</option>
                    <option value="Contract">Contract Agreement</option>
                    <option value="Freelancer / External Trainer">Freelancer / External</option>
                    <option value="Guest Lecturer">Guest Lecturer</option>
                  </Select>
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Joining Date" required hint="Click to open calendar">
                  <DatePicker
                    id="joining-date"
                    value={joiningDate}
                    onChange={setJoiningDate}
                    required
                    placeholder="Select joining date"
                  />
                </FormField>
                <FormField label="Status" required>
                  <Select
                    value={status}
                    onChange={e => setStatus(e.target.value as typeof status)}
                    className="bg-card text-xs h-10 border-border/80"
                  >
                    <option value="Active">Active / Engaged</option>
                    <option value="Inactive">Inactive / Suspended</option>
                  </Select>
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Card: Professional Details */}
          <Card className="bg-card border-border/80">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Professional Details
              </CardTitle>
              <CardDescription className="text-xs">Expertise, qualifications and record.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Skills / Specializations *</label>
                  <Input
                    required
                    placeholder="e.g. React, Next.js, SQL"
                    value={skills}
                    onChange={e => setSkills(e.target.value)}
                    className="bg-card text-xs h-10 border-border/80 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Experience (Years) *</label>
                  <Input
                    required
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    value={experience}
                    onChange={e => setExperience(e.target.value)}
                    className="bg-card text-xs h-10 border-border/80 focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Highest Qualification</label>
                  <Input
                    placeholder="e.g. B.Tech CS, MCA"
                    value={highestQualification}
                    onChange={e => setHighestQualification(e.target.value)}
                    className="bg-card text-xs h-10 border-border/80 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Certifications</label>
                  <Input
                    placeholder="e.g. AWS Certified, PMP"
                    value={certifications}
                    onChange={e => setCertifications(e.target.value)}
                    className="bg-card text-xs h-10 border-border/80 focus:border-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Training & Payment Details */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card: Training Details */}
          <Card className="bg-card border-border/80">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Training Details
              </CardTitle>
              <CardDescription className="text-xs">Schedule and lecture dispatch preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Technology / Subject *</label>
                  <Input
                    required
                    placeholder="e.g. Web Development"
                    value={technologySubject}
                    onChange={e => setTechnologySubject(e.target.value)}
                    className="bg-card text-xs h-10 border-border/80 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Training Mode</label>
                  <Select
                    value={trainingMode}
                    onChange={e => setTrainingMode(e.target.value as any)}
                    className="bg-card text-xs h-10 border-border/80"
                  >
                    <option value="Offline">Offline Classroom</option>
                    <option value="Online">Online Sessions</option>
                    <option value="Hybrid">Hybrid Model</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Available Days</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {DAYS_OF_WEEK.map(day => {
                    const isChecked = selectedDays.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer select-none ${
                          isChecked
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-secondary border-border/60 hover:border-border text-muted-foreground"
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    )
                  })}
                </div>
                {selectedDays.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Selected: {selectedDays.map(d => d.substring(0, 3)).join(", ")}
                  </p>
                )}
              </div>

              <FormField label="Available Time Slots" hint="Add one or more teaching windows">
                <TimeSlotPicker value={timeSlots} onChange={setTimeSlots} />
              </FormField>
            </CardContent>
          </Card>

          {/* Card: Payment Details */}
          <Card className="bg-card border-border/80">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" />
                Payment Details
              </CardTitle>
              <CardDescription className="text-xs">Payroll rates and bank transfer setup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Payment Model *</label>
                  <Select
                    value={paymentModel}
                    onChange={e => setPaymentModel(e.target.value as any)}
                    className="bg-card text-xs h-10 border-border/80"
                  >
                    <option value="Monthly Salary">Monthly Salary</option>
                    <option value="Per Hour">Per Hour rate</option>
                    <option value="Per Session">Per Session fee</option>
                    <option value="Per Batch">Per Batch fee</option>
                  </Select>
                </div>
                <FormField label="Salary / Rate Amount" required hint="Amount in INR (₹)">
                  <Input
                    required
                    type="number"
                    min="0"
                    icon={IndianRupee}
                    placeholder="e.g. 50000"
                    value={salaryRateAmount}
                    onChange={e => setSalaryRateAmount(e.target.value)}
                    className="bg-card text-xs h-10 border-border/80"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Account Holder Name</label>
                  <Input
                    placeholder="Bank account holder"
                    value={bankHolderName}
                    onChange={e => setBankHolderName(e.target.value)}
                    className="bg-card text-xs h-10 border-border/80 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Account Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Bank account no"
                      value={bankAccountNumber}
                      onChange={e => setBankAccountNumber(e.target.value)}
                      className="bg-card text-xs h-10 border-border/80 focus:border-primary pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">IFSC Code</label>
                  <Input
                    placeholder="e.g. SBIN0001234"
                    value={ifscCode}
                    onChange={e => setIfscCode(e.target.value)}
                    className="bg-card text-xs h-10 border-border/80 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">UPI ID</label>
                  <Input
                    placeholder="e.g. UPI@bank"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    className="bg-card text-xs h-10 border-border/80 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">PAN Number</label>
                  <Input
                    placeholder="e.g. ABCDE1234F"
                    value={panNumber}
                    onChange={e => setPanNumber(e.target.value.toUpperCase())}
                    className="bg-card text-xs h-10 border-border/80 focus:border-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 4: Documents Upload Dropzones */}
        <Card className="bg-card border-border/80">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Documents Upload
            </CardTitle>
            <CardDescription className="text-xs">Attach validation document files for audit compliance.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            {/* Dropzone 1: Resume */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Resume Upload</label>
              <div className="relative group border border-dashed border-border/80 rounded-xl p-5 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/50 transition-all text-center flex flex-col items-center justify-center cursor-pointer min-h-[120px]">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={e => handleFileChange(e, "resume")}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {resumeFile ? (
                  <div className="space-y-1.5">
                    <FileText className="h-7 w-7 text-primary mx-auto" />
                    <p className="text-xs font-bold truncate max-w-[180px] text-foreground">{resumeFile}</p>
                    <div className="flex items-center justify-center gap-1 text-[9px] font-semibold text-emerald-400">
                      <Check className="h-3 w-3 stroke-[3]" /> Loaded
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-muted-foreground">
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto group-hover:text-primary transition-colors" />
                    <p className="text-xs font-bold text-foreground">Click to upload Resume</p>
                    <p className="text-[10px]">PDF, DOCX formats</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dropzone 2: ID Proof */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">ID Proof</label>
              <div className="relative group border border-dashed border-border/80 rounded-xl p-5 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/50 transition-all text-center flex flex-col items-center justify-center cursor-pointer min-h-[120px]">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
                  onChange={e => handleFileChange(e, "idProof")}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {idProofFile ? (
                  <div className="space-y-1.5">
                    <FileText className="h-7 w-7 text-primary mx-auto" />
                    <p className="text-xs font-bold truncate max-w-[180px] text-foreground">{idProofFile}</p>
                    <div className="flex items-center justify-center gap-1 text-[9px] font-semibold text-emerald-400">
                      <Check className="h-3 w-3 stroke-[3]" /> Loaded
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-muted-foreground">
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto group-hover:text-primary transition-colors" />
                    <p className="text-xs font-bold text-foreground">Click to upload ID Proof</p>
                    <p className="text-[10px]">Aadhaar, PAN, Passport</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dropzone 3: Certifications */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Certifications Upload</label>
              <div className="relative group border border-dashed border-border/80 rounded-xl p-5 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/50 transition-all text-center flex flex-col items-center justify-center cursor-pointer min-h-[120px]">
                <input
                  type="file"
                  accept=".pdf,.zip,application/pdf,application/zip"
                  onChange={e => handleFileChange(e, "certs")}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {certificationsFile ? (
                  <div className="space-y-1.5">
                    <FileText className="h-7 w-7 text-primary mx-auto" />
                    <p className="text-xs font-bold truncate max-w-[180px] text-foreground">{certificationsFile}</p>
                    <div className="flex items-center justify-center gap-1 text-[9px] font-semibold text-emerald-400">
                      <Check className="h-3 w-3 stroke-[3]" /> Loaded
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-muted-foreground">
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto group-hover:text-primary transition-colors" />
                    <p className="text-xs font-bold text-foreground">Click to upload Certifications</p>
                    <p className="text-[10px]">PDF, ZIP (Max 10MB)</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3.5 pt-4 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/trainers")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={isEditMode ? Save : Plus}
            className="shadow-sm shadow-primary/20"
            disabled={saving || trainersAtCapacity}
          >
            {saving ? (isEditMode ? "Saving Changes..." : "Registering Instructor...") : (isEditMode ? "Save Changes" : "Register Trainer")}
          </Button>
        </div>
      </form>
    </div>
  )
}
