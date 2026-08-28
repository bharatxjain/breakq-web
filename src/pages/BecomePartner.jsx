import { useEffect, lazy, Suspense, useState } from "react";
import PageHeader from "../components/PageHeader";
import useReveal from "../hooks/useReveal";
import { supabase } from "../lib/supabaseClient";
import tickSuccessAnimation from "../assets/tick-success.json";
import "./BecomePartner.css";

// lottie-react pulls in the full lottie-web renderer (~380KB) — only load
// it once someone actually reaches the success screen, not on every page.
const Lottie = lazy(() => import("lottie-react"));

const MAX_FILE_MB = 5;

// 'pending' is the safe default for real vendors going live — flip to
// 'approved' locally only while testing the flow end-to-end.
const SHOP_STATUS = "pending";

// Matches the category set already used elsewhere on this site (About page).
// Verify these match the app's actual `primary_category` values before launch.
const CATEGORIES = [
  "Kirana",
  "Dairy",
  "Medical",
  "Electrical",
  "Bakery",
  "Stationery",
  "Fashion",
  "Mobiles",
];

const STEPS = [
  { key: "account", label: "Account" },
  { key: "verify", label: "Verify email" },
  { key: "shop", label: "Shop details" },
];

const initialAccount = { fullName: "", email: "", password: "", mobile: "", address: "" };
const initialShop = {
  name: "",
  ownerName: "",
  phone: "",
  address: "",
  category: "",
  yearsInBusiness: "",
  openTime: "09:00",
  closeTime: "21:00",
};

function validateAccount(a) {
  const errors = {};
  if (!a.fullName.trim()) errors.fullName = "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim())) errors.email = "Enter a valid email address.";
  if (a.password.length < 6) errors.password = "Password must be at least 6 characters.";
  if (!/^[6-9]\d{9}$/.test(a.mobile.trim())) errors.mobile = "Enter a valid 10-digit mobile number.";
  if (!a.address.trim()) errors.address = "Please enter your address.";
  return errors;
}

function validateShop(s, photo, location) {
  const errors = {};
  if (!s.name.trim()) errors.name = "Please enter your shop name.";
  if (!s.ownerName.trim()) errors.ownerName = "Please enter the owner name.";
  if (!/^[6-9]\d{9}$/.test(s.phone.trim())) errors.phone = "Enter a valid 10-digit phone number.";
  if (!s.address.trim()) errors.address = "Please enter the shop address.";
  if (!s.category) errors.category = "Please select a category.";
  if (s.yearsInBusiness === "" || Number(s.yearsInBusiness) < 0 || Number.isNaN(Number(s.yearsInBusiness))) {
    errors.yearsInBusiness = "Enter a valid number of years.";
  }
  if (!s.openTime) errors.openTime = "Required.";
  if (!s.closeTime) errors.closeTime = "Required.";
  if (!photo) errors.photo = "Please upload a photo of your shop.";
  if (photo && photo.size > MAX_FILE_MB * 1024 * 1024) errors.photo = `File must be under ${MAX_FILE_MB}MB.`;
  if (!location.lat || !location.lng) errors.location = "Please share your shop location.";
  return errors;
}

async function uploadShopFile(file, baseName) {
  const ext = file.name.split(".").pop();
  const path = `${baseName}.${ext}`;
  const { error } = await supabase.storage.from("shop-documents").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("shop-documents").getPublicUrl(path);
  return data.publicUrl;
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported on this device/browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
  });
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
  if (!res.ok) throw new Error("Could not look up that address.");
  const data = await res.json();
  if (!data.display_name) throw new Error("Could not look up that address.");
  return data.display_name;
}

const REGISTRATION_KEY = "breakq_partner_registration";

function readStoredRegistration() {
  try {
    const raw = localStorage.getItem(REGISTRATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredRegistration(email) {
  try {
    localStorage.setItem(REGISTRATION_KEY, JSON.stringify({ email }));
  } catch {
    // localStorage unavailable (private mode, etc.) — success screen just
    // won't survive a refresh, which is a fine fallback.
  }
}

function Stepper({ step }) {
  const activeIndex = Math.min(STEPS.findIndex((s) => s.key === step), STEPS.length - 1);
  return (
    <div className="bp-stepper">
      {STEPS.map((s, i) => (
        <div key={s.key} className={`bp-step ${i < activeIndex ? "is-done" : ""} ${i === activeIndex ? "is-active" : ""}`}>
          <span className="bp-step-dot">{i < activeIndex ? "✓" : i + 1}</span>
          <span className="bp-step-label">{s.label}</span>
          {i < STEPS.length - 1 && <span className="bp-step-line" />}
        </div>
      ))}
    </div>
  );
}

function FileField({ label, required, file, onChange, error, accept, hint }) {
  return (
    <div className="bp-field bp-field-file">
      <label className="bp-label">
        {label} {required && <span className="bp-required">*</span>}
      </label>
      <label className={`bp-dropzone ${file ? "has-file" : ""} ${error ? "has-error" : ""}`}>
        <input type="file" accept={accept} onChange={onChange} />
        <span className="bp-dropzone-icon">{file ? "✅" : "📎"}</span>
        <span className="bp-dropzone-text">{file ? file.name : "Click to upload"}</span>
      </label>
      {hint && !error && <span className="bp-hint">{hint}</span>}
      {error && <span className="bp-error">{error}</span>}
    </div>
  );
}

export default function BecomePartner() {
  const [step, setStep] = useState(() => (readStoredRegistration() ? "success" : "account"));
  const [session, setSession] = useState(null);
  const [successEmail, setSuccessEmail] = useState(() => readStoredRegistration()?.email || "");
  const [formRef, formInView] = useReveal();

  // Step 1: account
  const [account, setAccount] = useState(initialAccount);
  const [accountErrors, setAccountErrors] = useState({});
  const [submittingAccount, setSubmittingAccount] = useState(false);
  const [locatingAccount, setLocatingAccount] = useState(false);
  const [accountLocationError, setAccountLocationError] = useState("");

  // Step 2: verify
  const [otp, setOtp] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent

  // Step 3: shop
  const [shop, setShop] = useState(initialShop);
  const [shopErrors, setShopErrors] = useState({});
  const [photo, setPhoto] = useState(null);
  const [businessProof, setBusinessProof] = useState(null);
  const [location, setLocation] = useState({ lat: "", lng: "" });
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [submittingShop, setSubmittingShop] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Pick up an existing/newly-verified session (covers both the "click the
  // email link" and "enter the OTP" paths — the link redirects back here
  // with a session already established).
  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        setSession(data.session);
        setStep((s) => (s === "success" ? s : "shop"));
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) {
        setSession(newSession);
        setStep((s) => (s === "success" ? s : "shop"));
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Prefill shop details from account info / auth metadata once signed in.
  useEffect(() => {
    if (!session) return;
    const meta = session.user.user_metadata || {};
    setShop((s) => ({
      ...s,
      ownerName: s.ownerName || meta.full_name || account.fullName || "",
      phone: s.phone || meta.mobile || account.mobile || "",
      address: s.address || meta.address || account.address || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function updateAccount(field, value) {
    setAccount((a) => ({ ...a, [field]: value }));
  }

  function updateShop(field, value) {
    setShop((s) => ({ ...s, [field]: value }));
  }

  async function handleAccountSubmit(e) {
    e.preventDefault();
    const errors = validateAccount(account);
    setAccountErrors(errors);
    if (Object.keys(errors).length) return;

    if (!supabase) {
      setAccountErrors({ form: "We couldn't reach our servers. Please try again shortly." });
      return;
    }

    setSubmittingAccount(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: account.email.trim(),
        password: account.password,
        options: {
          data: {
            full_name: account.fullName.trim(),
            mobile: account.mobile.trim(),
            address: account.address.trim(),
          },
        },
      });
      if (error) throw error;

      if (data.session) {
        setSession(data.session);
        setStep("shop");
      } else {
        setStep("verify");
      }
    } catch (err) {
      setAccountErrors({ form: err.message || "Something went wrong. Please try again." });
    } finally {
      setSubmittingAccount(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setVerifyError("Enter the 6-digit code from your email.");
      return;
    }
    setVerifying(true);
    setVerifyError("");
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: account.email.trim(),
        token: otp,
        type: "signup",
      });
      if (error) throw error;
      setSession(data.session);
      setStep("shop");
    } catch (err) {
      setVerifyError(err.message || "Invalid or expired code.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setResendState("sending");
    try {
      await supabase.auth.resend({ type: "signup", email: account.email.trim() });
      setResendState("sent");
    } catch {
      setResendState("idle");
    }
  }

  function handleChangeEmail() {
    setOtp("");
    setVerifyError("");
    setResendState("idle");
    setStep("account");
  }

  async function handleUseAccountLocation() {
    setLocatingAccount(true);
    setAccountLocationError("");
    try {
      const pos = await getCurrentPosition();
      const address = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      updateAccount("address", address);
    } catch (err) {
      setAccountLocationError(err.message || "Could not get your location. You can enter it manually below.");
    } finally {
      setLocatingAccount(false);
    }
  }

  async function handleUseLocation() {
    setLocating(true);
    setLocationError("");
    try {
      const pos = await getCurrentPosition();
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      setLocation({ lat, lng });
      try {
        const address = await reverseGeocode(lat, lng);
        updateShop("address", address);
      } catch {
        // Coordinates are captured either way — address text is a bonus, not required.
      }
    } catch (err) {
      setLocationError(err.message || "Could not get your location. You can enter it manually below.");
    } finally {
      setLocating(false);
    }
  }

  async function handleShopSubmit(e) {
    e.preventDefault();
    const errors = validateShop(shop, photo, location);
    setShopErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmittingShop(true);
    setSubmitError("");

    try {
      const shopId = "s_" + Date.now();
      const photoUrl = await uploadShopFile(photo, `${shopId}_shop`);
      const proofUrl = businessProof ? await uploadShopFile(businessProof, `${shopId}_proof`) : null;

      const { error } = await supabase.from("shops").insert({
        id: shopId,
        name: shop.name.trim(),
        owner_name: shop.ownerName.trim(),
        owner_id: session.user.id,
        address: shop.address.trim(),
        phone: shop.phone.trim(),
        lat: Number(location.lat),
        lng: Number(location.lng),
        primary_category: shop.category,
        years_in_business: Number(shop.yearsInBusiness),
        is_partner: false,
        accepting_orders: true,
        open_time: shop.openTime,
        close_time: shop.closeTime,
        image_url: photoUrl,
        business_proof_url: proofUrl,
        status: SHOP_STATUS,
      });
      if (error) throw error;

      // Best-effort confirmation email — never block the success screen on this.
      supabase.functions
        .invoke("notify-vendor-registration", {
          body: { email: session.user.email, ownerName: shop.ownerName.trim(), shopName: shop.name.trim() },
        })
        .catch(() => {});

      writeStoredRegistration(session.user.email);
      setSuccessEmail(session.user.email);
      setStep("success");
    } catch (err) {
      setSubmitError(err.message || "Something went wrong while submitting. Please try again.");
    } finally {
      setSubmittingShop(false);
    }
  }

  function handleRegisterAnother() {
    setShop(initialShop);
    setShopErrors({});
    setPhoto(null);
    setBusinessProof(null);
    setLocation({ lat: "", lng: "" });
    setLocationError("");
    setSubmitError("");
    // Still signed in? Go straight to shop details. Session expired since
    // they registered? Send them through sign-in again first.
    setStep(session ? "shop" : "account");
  }

  return (
    <>
      <PageHeader
        eyebrow="Partner with us"
        title="Become a BreakQ Partner"
        subtitle="Set up your shop once on the web, then manage orders day-to-day from the BreakQ app."
      />

      <section className="section bp-section">
        <div className="container bp-narrow">
          <div ref={formRef} className={`bp-card ${formInView ? "is-visible" : ""}`}>
            {step !== "success" && <Stepper step={step} />}

            {step === "account" && (
              <form className="bp-form" onSubmit={handleAccountSubmit} noValidate>
                {accountErrors.form && <div className="bp-banner-error">{accountErrors.form}</div>}

                <div className="bp-field">
                  <label className="bp-label" htmlFor="bp-fullname">
                    Full Name <span className="bp-required">*</span>
                  </label>
                  <input
                    id="bp-fullname"
                    type="text"
                    value={account.fullName}
                    onChange={(e) => updateAccount("fullName", e.target.value)}
                    className={accountErrors.fullName ? "has-error" : ""}
                    placeholder="Your name"
                  />
                  {accountErrors.fullName && <span className="bp-error">{accountErrors.fullName}</span>}
                </div>

                <div className="bp-grid">
                  <div className="bp-field">
                    <label className="bp-label" htmlFor="bp-email">
                      Email <span className="bp-required">*</span>
                    </label>
                    <input
                      id="bp-email"
                      type="email"
                      value={account.email}
                      onChange={(e) => updateAccount("email", e.target.value)}
                      className={accountErrors.email ? "has-error" : ""}
                      placeholder="you@example.com"
                    />
                    {accountErrors.email && <span className="bp-error">{accountErrors.email}</span>}
                  </div>

                  <div className="bp-field">
                    <label className="bp-label" htmlFor="bp-password">
                      Password <span className="bp-required">*</span>
                    </label>
                    <input
                      id="bp-password"
                      type="password"
                      value={account.password}
                      onChange={(e) => updateAccount("password", e.target.value)}
                      className={accountErrors.password ? "has-error" : ""}
                      placeholder="At least 6 characters"
                    />
                    {accountErrors.password && <span className="bp-error">{accountErrors.password}</span>}
                  </div>
                </div>

                <div className="bp-field">
                  <label className="bp-label" htmlFor="bp-mobile">
                    Mobile Number <span className="bp-required">*</span>
                  </label>
                  <input
                    id="bp-mobile"
                    type="tel"
                    inputMode="numeric"
                    value={account.mobile}
                    onChange={(e) => updateAccount("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className={accountErrors.mobile ? "has-error" : ""}
                    placeholder="10-digit mobile number"
                  />
                  {accountErrors.mobile && <span className="bp-error">{accountErrors.mobile}</span>}
                </div>

                <div className="bp-field">
                  <label className="bp-label" htmlFor="bp-address">
                    Address <span className="bp-required">*</span>
                  </label>
                  <textarea
                    id="bp-address"
                    rows={3}
                    value={account.address}
                    onChange={(e) => updateAccount("address", e.target.value)}
                    className={accountErrors.address ? "has-error" : ""}
                    placeholder="Area, city, pincode"
                  />
                  <button
                    type="button"
                    className="bp-location-btn"
                    onClick={handleUseAccountLocation}
                    disabled={locatingAccount}
                  >
                    <img src="/location.png" alt="" className="bp-location-icon" />
                    {locatingAccount ? "Locating…" : "Use my current location"}
                  </button>
                  {accountLocationError && <span className="bp-error">{accountLocationError}</span>}
                  {accountErrors.address && <span className="bp-error">{accountErrors.address}</span>}
                </div>

                <button type="submit" className="btn btn-primary bp-submit" disabled={submittingAccount}>
                  {submittingAccount ? "Creating account…" : "Continue"}
                </button>
              </form>
            )}

            {step === "verify" && (
              <form className="bp-form" onSubmit={handleVerifyOtp} noValidate>
                <p className="bp-verify-text">
                  We sent a verification link and a 6-digit code to <strong>{account.email}</strong>. Click the
                  link, or enter the code below.
                </p>

                <div className="bp-field">
                  <label className="bp-label" htmlFor="bp-otp">
                    Verification code
                  </label>
                  <input
                    id="bp-otp"
                    type="text"
                    inputMode="numeric"
                    className={`bp-otp-input ${verifyError ? "has-error" : ""}`}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                  />
                  {verifyError && <span className="bp-error">{verifyError}</span>}
                </div>

                <button type="submit" className="btn btn-primary bp-submit" disabled={verifying}>
                  {verifying ? "Verifying…" : "Verify"}
                </button>

                <div className="bp-verify-actions">
                  <button
                    type="button"
                    className="bp-resend"
                    onClick={handleResend}
                    disabled={resendState === "sending"}
                  >
                    {resendState === "sent"
                      ? "Code resent ✓"
                      : resendState === "sending"
                        ? "Resending…"
                        : "Resend code"}
                  </button>
                  <span className="bp-verify-sep">·</span>
                  <button type="button" className="bp-resend" onClick={handleChangeEmail}>
                    Wrong email? Change it
                  </button>
                </div>
              </form>
            )}

            {step === "shop" && (
              <form className="bp-form" onSubmit={handleShopSubmit} noValidate>
                {submitError && <div className="bp-banner-error">{submitError}</div>}

                <div className="bp-grid">
                  <div className="bp-field">
                    <label className="bp-label" htmlFor="bp-shop-name">
                      Shop Name <span className="bp-required">*</span>
                    </label>
                    <input
                      id="bp-shop-name"
                      type="text"
                      value={shop.name}
                      onChange={(e) => updateShop("name", e.target.value)}
                      className={shopErrors.name ? "has-error" : ""}
                      placeholder="e.g. Sharma Kirana Store"
                    />
                    {shopErrors.name && <span className="bp-error">{shopErrors.name}</span>}
                  </div>

                  <div className="bp-field">
                    <label className="bp-label" htmlFor="bp-owner-name">
                      Owner Name <span className="bp-required">*</span>
                    </label>
                    <input
                      id="bp-owner-name"
                      type="text"
                      value={shop.ownerName}
                      onChange={(e) => updateShop("ownerName", e.target.value)}
                      className={shopErrors.ownerName ? "has-error" : ""}
                    />
                    {shopErrors.ownerName && <span className="bp-error">{shopErrors.ownerName}</span>}
                  </div>
                </div>

                <div className="bp-field">
                  <label className="bp-label" htmlFor="bp-shop-address">
                    Shop Address <span className="bp-required">*</span>
                  </label>
                  <textarea
                    id="bp-shop-address"
                    rows={3}
                    value={shop.address}
                    onChange={(e) => updateShop("address", e.target.value)}
                    className={shopErrors.address ? "has-error" : ""}
                    placeholder="Shop address, area, city, pincode"
                  />
                  {!shopErrors.address && (
                    <span className="bp-hint">Tip: "Use my current location" below fills this in automatically.</span>
                  )}
                  {shopErrors.address && <span className="bp-error">{shopErrors.address}</span>}
                </div>

                <div className="bp-grid">
                  <div className="bp-field">
                    <label className="bp-label" htmlFor="bp-shop-phone">
                      Phone <span className="bp-required">*</span>
                    </label>
                    <input
                      id="bp-shop-phone"
                      type="tel"
                      inputMode="numeric"
                      value={shop.phone}
                      onChange={(e) => updateShop("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className={shopErrors.phone ? "has-error" : ""}
                    />
                    {shopErrors.phone && <span className="bp-error">{shopErrors.phone}</span>}
                  </div>

                  <div className="bp-field">
                    <label className="bp-label" htmlFor="bp-category">
                      Category <span className="bp-required">*</span>
                    </label>
                    <select
                      id="bp-category"
                      value={shop.category}
                      onChange={(e) => updateShop("category", e.target.value)}
                      className={shopErrors.category ? "has-error" : ""}
                    >
                      <option value="">Select a category</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {shopErrors.category && <span className="bp-error">{shopErrors.category}</span>}
                  </div>
                </div>

                <div className="bp-grid">
                  <div className="bp-field">
                    <label className="bp-label" htmlFor="bp-years">
                      Years in Business <span className="bp-required">*</span>
                    </label>
                    <input
                      id="bp-years"
                      type="number"
                      min="0"
                      value={shop.yearsInBusiness}
                      onChange={(e) => updateShop("yearsInBusiness", e.target.value)}
                      className={shopErrors.yearsInBusiness ? "has-error" : ""}
                      placeholder="e.g. 5"
                    />
                    {shopErrors.yearsInBusiness && <span className="bp-error">{shopErrors.yearsInBusiness}</span>}
                  </div>

                  <div className="bp-field bp-field-hours">
                    <label className="bp-label">
                      Open — Close <span className="bp-required">*</span>
                    </label>
                    <div className="bp-hours-row">
                      <input
                        type="time"
                        value={shop.openTime}
                        onChange={(e) => updateShop("openTime", e.target.value)}
                        className={shopErrors.openTime ? "has-error" : ""}
                      />
                      <span>–</span>
                      <input
                        type="time"
                        value={shop.closeTime}
                        onChange={(e) => updateShop("closeTime", e.target.value)}
                        className={shopErrors.closeTime ? "has-error" : ""}
                      />
                    </div>
                    {(shopErrors.openTime || shopErrors.closeTime) && (
                      <span className="bp-error">{shopErrors.openTime || shopErrors.closeTime}</span>
                    )}
                  </div>
                </div>

                <div className="bp-field">
                  <label className="bp-label">
                    Shop Location <span className="bp-required">*</span>
                  </label>
                  <button type="button" className="bp-location-btn" onClick={handleUseLocation} disabled={locating}>
                    <img src="/location.png" alt="" className="bp-location-icon" />
                    {locating ? "Locating…" : "Use my current location"}
                  </button>
                  {location.lat && location.lng && (
                    <span className="bp-hint">
                      Captured: {location.lat}, {location.lng}
                    </span>
                  )}
                  {locationError && <span className="bp-error">{locationError}</span>}
                  <div className="bp-grid bp-location-manual">
                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={location.lat}
                      onChange={(e) => setLocation((l) => ({ ...l, lat: e.target.value }))}
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={location.lng}
                      onChange={(e) => setLocation((l) => ({ ...l, lng: e.target.value }))}
                    />
                  </div>
                  {shopErrors.location && <span className="bp-error">{shopErrors.location}</span>}
                </div>

                <div className="bp-grid">
                  <FileField
                    label="Shop Photo"
                    required
                    file={photo}
                    onChange={(e) => setPhoto(e.target.files[0] || null)}
                    error={shopErrors.photo}
                    accept="image/*"
                    hint="PNG or JPG, up to 5MB"
                  />

                  <FileField
                    label="Business Proof"
                    file={businessProof}
                    onChange={(e) => setBusinessProof(e.target.files[0] || null)}
                    error={shopErrors.businessProof}
                    accept="image/*,.pdf"
                    hint="Optional — image or PDF, up to 5MB"
                  />
                </div>

                <button type="submit" className="btn btn-primary bp-submit" disabled={submittingShop}>
                  {submittingShop ? "Submitting…" : "Complete registration"}
                </button>
              </form>
            )}

            {step === "success" && (
              <div className="bp-success">
                <Suspense fallback={<div className="bp-success-icon" />}>
                  <Lottie
                    animationData={tickSuccessAnimation}
                    loop={false}
                    className="bp-success-icon"
                    aria-hidden="true"
                  />
                </Suspense>
                <h2>You're all set!</h2>
                <span className="bp-review-badge">Under review</span>
                <p>
                  Your shop has been submitted and is now under review. We'll email you at{" "}
                  <strong>{successEmail}</strong> as soon as it's verified.
                </p>
                <p>
                  Meanwhile, download the BreakQ app and log in with the same email — your Vendor Dashboard unlocks
                  automatically once your shop is approved.
                </p>

                <a
                  href="https://play.google.com/store/apps/details?id=com.kks.bharatkirana"
                  className="bp-android-btn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg viewBox="0 0 24 24" className="bp-android-icon" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"
                    />
                  </svg>
                  Download for Android
                </a>

                <button type="button" className="bp-register-another" onClick={handleRegisterAnother}>
                  Register another shop
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
