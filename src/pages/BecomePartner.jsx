import { useState } from "react";
import PageHeader from "../components/PageHeader";
import useReveal from "../hooks/useReveal";
import { supabase } from "../lib/supabaseClient";
import "./BecomePartner.css";

const MAX_FILE_MB = 5;

const initialForm = {
  name: "",
  mobile: "",
  address: "",
  experience: "",
  gstin: "",
};

function validate(form, photo) {
  const errors = {};

  if (!form.name.trim()) errors.name = "Please enter your full name.";

  if (!form.mobile.trim()) {
    errors.mobile = "Please enter your mobile number.";
  } else if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) {
    errors.mobile = "Enter a valid 10-digit mobile number.";
  }

  if (!form.address.trim())
    errors.address = "Please enter your business address.";

  if (form.experience === "") {
    errors.experience = "Please enter your years of experience.";
  } else if (
    Number(form.experience) < 0 ||
    Number.isNaN(Number(form.experience))
  ) {
    errors.experience = "Enter a valid number of years.";
  }

  if (form.gstin.trim() && !/^[0-9A-Z]{15}$/i.test(form.gstin.trim())) {
    errors.gstin = "GSTIN should be 15 characters.";
  }

  if (!photo) errors.photo = "Please upload a photo of you or your shop.";

  return errors;
}

function checkFileSize(file, field, errors) {
  if (file && file.size > MAX_FILE_MB * 1024 * 1024) {
    errors[field] = `File must be under ${MAX_FILE_MB}MB.`;
  }
}

async function uploadFile(file, kind) {
  const ext = file.name.split(".").pop();
  const path = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from("partner-applications")
    .upload(path, file);
  if (error) throw error;
  return path;
}

function FileField({ label, required, file, onChange, error, accept, hint }) {
  return (
    <div className="bp-field bp-field-file">
      <label className="bp-label">
        {label} {required && <span className="bp-required">*</span>}
      </label>
      <label
        className={`bp-dropzone ${file ? "has-file" : ""} ${error ? "has-error" : ""}`}
      >
        <input type="file" accept={accept} onChange={onChange} />
        <span className="bp-dropzone-icon">{file ? "✅" : "📎"}</span>
        <span className="bp-dropzone-text">
          {file ? file.name : "Click to upload"}
        </span>
      </label>
      {hint && !error && <span className="bp-hint">{hint}</span>}
      {error && <span className="bp-error">{error}</span>}
    </div>
  );
}

export default function BecomePartner() {
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(null);
  const [businessProof, setBusinessProof] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [formRef, formInView] = useReveal();

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationErrors = validate(form, photo);
    checkFileSize(photo, "photo", validationErrors);
    checkFileSize(businessProof, "businessProof", validationErrors);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    if (!supabase) {
      setStatus({
        type: "error",
        message: "We couldn't reach our servers. Please try again shortly.",
      });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const photoPath = await uploadFile(photo, "photo");
      const proofPath = businessProof
        ? await uploadFile(businessProof, "business-proof")
        : null;

      const { error } = await supabase.from("partner_applications").insert({
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        business_address: form.address.trim(),
        years_experience: Number(form.experience),
        gstin: form.gstin.trim() || null,
        photo_path: photoPath,
        business_proof_path: proofPath,
      });

      if (error) throw error;

      setStatus({ type: "success" });
      setForm(initialForm);
      setPhoto(null);
      setBusinessProof(null);
      setErrors({});
    } catch (err) {
      setStatus({
        type: "error",
        message: "Something went wrong while submitting. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Partner with us"
        title="Become a BreakQ Partner"
        subtitle="Bring your shop online and reach more customers in your neighborhood. Tell us a bit about your business and our team will reach out."
      />

      <section className="section bp-section">
        <div className="container bp-narrow">
          <div
            ref={formRef}
            className={`bp-card ${formInView ? "is-visible" : ""}`}
          >
            {status?.type === "success" ? (
              <div className="bp-success">
                <div className="bp-success-icon">🎉</div>
                <h2>Application received!</h2>
                <p>
                  Thanks for your interest in partnering with BreakQ. Our team
                  will reach out to you shortly.
                </p>
              </div>
            ) : (
              <form className="bp-form" onSubmit={handleSubmit} noValidate>
                {status?.type === "error" && (
                  <div className="bp-banner-error">{status.message}</div>
                )}

                <div className="bp-grid">
                  <div className="bp-field">
                    <label className="bp-label" htmlFor="bp-name">
                      Full Name <span className="bp-required">*</span>
                    </label>
                    <input
                      id="bp-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className={errors.name ? "has-error" : ""}
                      placeholder="Your name"
                    />
                    {errors.name && (
                      <span className="bp-error">{errors.name}</span>
                    )}
                  </div>

                  <div className="bp-field">
                    <label className="bp-label" htmlFor="bp-mobile">
                      Mobile Number <span className="bp-required">*</span>
                    </label>
                    <input
                      id="bp-mobile"
                      type="tel"
                      inputMode="numeric"
                      value={form.mobile}
                      onChange={(e) =>
                        updateField(
                          "mobile",
                          e.target.value.replace(/\D/g, "").slice(0, 10),
                        )
                      }
                      className={errors.mobile ? "has-error" : ""}
                      placeholder="10-digit mobile number"
                    />
                    {errors.mobile && (
                      <span className="bp-error">{errors.mobile}</span>
                    )}
                  </div>
                </div>

                <div className="bp-field">
                  <label className="bp-label" htmlFor="bp-address">
                    Business Address <span className="bp-required">*</span>
                  </label>
                  <textarea
                    id="bp-address"
                    rows={3}
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className={errors.address ? "has-error" : ""}
                    placeholder="Shop address, area, city, pincode"
                  />
                  {errors.address && (
                    <span className="bp-error">{errors.address}</span>
                  )}
                </div>

                <div className="bp-grid">
                  <div className="bp-field">
                    <label className="bp-label" htmlFor="bp-experience">
                      Years of Experience <span className="bp-required">*</span>
                    </label>
                    <input
                      id="bp-experience"
                      type="number"
                      min="0"
                      value={form.experience}
                      onChange={(e) =>
                        updateField("experience", e.target.value)
                      }
                      className={errors.experience ? "has-error" : ""}
                      placeholder="e.g. 5"
                    />
                    {errors.experience && (
                      <span className="bp-error">{errors.experience}</span>
                    )}
                  </div>

                  <div className="bp-field">
                    <label className="bp-label" htmlFor="bp-gstin">
                      GSTIN <span className="bp-optional">(optional)</span>
                    </label>
                    <input
                      id="bp-gstin"
                      type="text"
                      value={form.gstin}
                      onChange={(e) =>
                        updateField("gstin", e.target.value.toUpperCase())
                      }
                      className={errors.gstin ? "has-error" : ""}
                      placeholder="15-character GSTIN"
                    />
                    {errors.gstin && (
                      <span className="bp-error">{errors.gstin}</span>
                    )}
                  </div>
                </div>

                <div className="bp-grid">
                  <FileField
                    label="Photo of you / your shop"
                    required
                    file={photo}
                    onChange={(e) => setPhoto(e.target.files[0] || null)}
                    error={errors.photo}
                    accept="image/*"
                    hint="PNG or JPG, up to 5MB"
                  />

                  <FileField
                    label="Business Proof"
                    file={businessProof}
                    onChange={(e) =>
                      setBusinessProof(e.target.files[0] || null)
                    }
                    error={errors.businessProof}
                    accept="image/*,.pdf"
                    hint="Optional - image or PDF, up to 5MB"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary bp-submit"
                  disabled={submitting}
                >
                  {submitting ? "Submitting…" : "Submit application"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
