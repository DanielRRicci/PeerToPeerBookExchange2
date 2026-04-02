import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";
import { getStoredUser } from "./auth";

function PostBook() {
  const navigate    = useNavigate();
  const fileInputRef = useRef(null);
  const currentUser  = getStoredUser();

  const [mode, setMode]   = useState("book");
  const [formData, setFormData] = useState({
    title: "", author: "", edition: "", isbn: "",
    course_code: "", book_condition: "Good", price: "", notes: "",
  });
  const [imageSlots, setImageSlots] = useState([null, null, null, null, null, null]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [notesData, setNotesData] = useState({ title: "", course_code: "", description: "" });
  const [pdfFile, setPdfFile]         = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);

  useEffect(() => {
    return () => {
      imageSlots.forEach((slot) => { if (slot?.previewUrl) URL.revokeObjectURL(slot.previewUrl); });
    };
  }, [imageSlots]);

  const handleChange      = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleNotesChange = (e) => setNotesData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const getNextOpenSlotIndex = () => imageSlots.findIndex((s) => s === null);

  const handleUploadButtonClick = () => {
    setError("");
    if (getNextOpenSlotIndex() === -1) { setError("You already added 6 images."); return; }
    fileInputRef.current?.click();
  };

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const nextOpenIndex = getNextOpenSlotIndex();
    if (nextOpenIndex === -1) { setError("You already added 6 images."); return; }
    const previewUrl = URL.createObjectURL(file);
    setImageSlots((prev) => {
      const updated = [...prev];
      updated[nextOpenIndex] = { file, previewUrl };
      return updated;
    });
    setError("");
  };

  const removeImageAtIndex = (indexToRemove) => {
    setImageSlots((prev) => {
      const filledSlots = prev.filter((slot, index) => {
        if (index === indexToRemove && prev[index]?.previewUrl) URL.revokeObjectURL(prev[index].previewUrl);
        return index !== indexToRemove && slot !== null;
      });
      const rebuilt = [...filledSlots];
      while (rebuilt.length < 6) rebuilt.push(null);
      return rebuilt;
    });
  };

  const handleNotesSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccessMessage("");
    if (!currentUser?.id)            { setError("You must be logged in to post notes."); return; }
    if (!notesData.title.trim())     { setError("Title is required."); return; }
    if (!pdfFile)                    { setError("Please select a PDF file."); return; }
    setSubmitting(true); setPdfUploading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const urlRes  = await fetch(`${baseUrl}/api/upload-url?filename=${encodeURIComponent(pdfFile.name)}&contentType=application/pdf&folder=PDF`);
      const { uploadUrl, publicUrl } = await urlRes.json();
      await fetch(uploadUrl, { method: "PUT", body: pdfFile, headers: { "Content-Type": "application/pdf" } });
      setPdfUploading(false);
      const notesRes = await fetch(`${baseUrl}/Notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id, title: notesData.title.trim(), course_code: notesData.course_code.trim() || null, description: notesData.description.trim() || null, pdf_url: publicUrl }),
      });
      const notesJson = await notesRes.json();
      if (!notesRes.ok) throw new Error(notesJson.error || "Failed to post notes.");
      setSuccessMessage("Notes posted successfully!");
      setTimeout(() => navigate("/booklistings"), 900);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false); setPdfUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccessMessage("");
    if (!currentUser?.id)                                                    { setError("You must be logged in to post a listing."); return; }
    if (!formData.title.trim())                                              { setError("Title is required."); return; }
    if (!formData.author.trim())                                             { setError("Author is required."); return; }
    if (!formData.book_condition.trim())                                     { setError("Condition is required."); return; }
    if (formData.price === "" || Number.isNaN(Number(formData.price)))      { setError("Enter a valid price."); return; }
    if (Number(formData.price) < 0)                                         { setError("Price cannot be negative."); return; }

    setSubmitting(true);
    try {
      const baseUrl = getApiBaseUrl();
      const listingResponse = await fetch(`${baseUrl}/BookListings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUser.id,
          title: formData.title.trim(), author: formData.author.trim(),
          edition: formData.edition.trim() || null, isbn: formData.isbn.trim() || null,
          price: Number(formData.price), course_code: formData.course_code.trim() || null,
          book_condition: formData.book_condition, notes: formData.notes.trim() || null,
          image_url: null,
        }),
      });
      const listingData = await listingResponse.json();
      if (!listingResponse.ok) throw new Error(listingData.error || listingData.message || "Failed to create listing.");

      const listingId = listingData.listing_id;
      const selectedFiles = imageSlots.filter((s) => s !== null).map((s) => s.file);

      if (selectedFiles.length > 0) {
        const imageFormData = new FormData();
        imageFormData.append("prefix", "Post_Pic");
        imageFormData.append("listingId", String(listingId));
        selectedFiles.forEach((file) => imageFormData.append("images", file));
        const imageResponse = await fetch(`${baseUrl}/api/images`, { method: "POST", body: imageFormData });
        const imageData = await imageResponse.json();
        if (!imageResponse.ok) throw new Error(imageData.error || imageData.message || "Listing was created, but image upload failed.");
      }

      setSuccessMessage("Listing posted successfully.");
      setTimeout(() => navigate("/booklistings"), 900);
    } catch (err) {
      setError(err.message || "Something went wrong while posting your listing.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .post-page {
          min-height: calc(100vh - 64px);
          width: 100vw;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          padding: 2.5rem 1.5rem;
          background:
            linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)),
            url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2128&auto=format&fit=crop') center/cover no-repeat fixed;
        }
        .post-page::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse 60% 50% at 20% 50%, rgba(255,189,0,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 80% 30%, rgba(255,189,0,0.04) 0%, transparent 50%);
        }
        .post-page::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,189,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,189,0,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .post-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 780px;
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,189,0,0.12);
          overflow: hidden;
        }

        .post-card-header {
          background: #0a0a0a;
          padding: 28px 36px 24px;
          border-bottom: 3px solid #FFBD00;
        }
        .post-eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: rgba(255,189,0,0.6);
          margin-bottom: 6px;
        }
        .post-heading {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 42px;
          letter-spacing: 2px;
          color: #FFBD00;
          line-height: 1;
          margin-bottom: 18px;
        }

        /* Mode toggle */
        .mode-toggle {
          display: flex;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid rgba(255,189,0,0.3);
          width: fit-content;
        }
        .mode-btn {
          padding: 8px 22px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          border: none;
          cursor: pointer;
          transition: background 0.18s, color 0.18s;
        }
        .mode-btn.active  { background: #FFBD00; color: #0a0a0a; }
        .mode-btn.inactive { background: transparent; color: rgba(255,255,255,0.5); }
        .mode-btn.inactive:hover { color: rgba(255,255,255,0.85); }

        .post-card-body { padding: 28px 36px 32px; }

        /* Alert banners */
        .post-error {
          padding: 10px 14px;
          background: #fef2f2;
          border-left: 3px solid #dc2626;
          border-radius: 6px;
          color: #dc2626;
          font-size: 13px;
          margin-bottom: 18px;
        }
        .post-success {
          padding: 10px 14px;
          background: #f0fdf4;
          border-left: 3px solid #22c55e;
          border-radius: 6px;
          color: #15803d;
          font-size: 13px;
          margin-bottom: 18px;
          font-weight: 600;
        }

        /* Form layout */
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .form-full { grid-column: 1 / -1; }

        .form-group { display: flex; flex-direction: column; }
        .form-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 5px;
        }
        .form-input,
        .form-select,
        .form-textarea {
          padding: 10px 13px;
          border: 1.5px solid #e8e8e8;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #0a0a0a;
          background: #fafafa;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          width: 100%;
        }
        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          border-color: #FFBD00;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(255,189,0,0.12);
        }
        .form-textarea { min-height: 100px; resize: vertical; }

        /* Image grid */
        .img-section { margin-top: 4px; }
        .img-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 8px 0 12px;
        }
        .img-slot {
          position: relative;
          aspect-ratio: 1 / 1;
          border: 2px dashed #ddd;
          border-radius: 10px;
          background: #fafafa;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .img-slot-empty {
          color: #bbb;
          font-size: 12px;
          font-weight: 600;
        }
        .img-preview { width: 100%; height: 100%; object-fit: cover; display: block; }
        .img-num-badge {
          position: absolute;
          top: 7px; left: 7px;
          background: rgba(0,0,0,0.75);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 999px;
          z-index: 1;
        }
        .img-remove {
          position: absolute;
          top: 7px; right: 7px;
          width: 26px; height: 26px;
          border-radius: 50%;
          border: none;
          background: rgba(0,0,0,0.75);
          color: #fff;
          font-weight: 800;
          cursor: pointer;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .upload-btn {
          width: 100%;
          padding: 11px;
          background: #fafafa;
          color: #0a0a0a;
          border: 1.5px solid #e8e8e8;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .upload-btn:hover { border-color: #FFBD00; background: #fff; }

        .helper-text { margin-top: 7px; color: #aaa; font-size: 12px; }

        /* PDF drop zone */
        .pdf-zone {
          border: 2px dashed #e8e8e8;
          border-radius: 10px;
          padding: 24px;
          text-align: center;
          background: #fafafa;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .pdf-zone:hover { border-color: #FFBD00; background: #fff; }
        .pdf-zone-text { color: #aaa; font-size: 13px; }
        .pdf-zone-name { font-weight: 700; color: #0a0a0a; font-size: 13px; }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: #0a0a0a;
          color: #FFBD00;
          border: none;
          border-radius: 8px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 2px;
          cursor: pointer;
          margin-top: 20px;
          transition: background 0.2s, transform 0.15s;
        }
        .submit-btn:hover:not(:disabled) { background: #222; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #aaa;
          text-decoration: none;
          margin-top: 18px;
          transition: color 0.2s;
        }
        .back-link:hover { color: #FFBD00; }
      `}</style>

      <div className="post-page">
        <div className="post-card">

          {/* Header */}
          <div className="post-card-header">
            <div className="post-eyebrow">UWM Student Marketplace</div>
            <div className="post-heading">
              {mode === "book" ? "Post a Book" : "Post Notes"}
            </div>

            <div className="mode-toggle">
              <button
                type="button"
                className={`mode-btn ${mode === "book" ? "active" : "inactive"}`}
                onClick={() => { setMode("book"); setError(""); setSuccessMessage(""); }}
              >
                📚 Book
              </button>
              <button
                type="button"
                className={`mode-btn ${mode === "notes" ? "active" : "inactive"}`}
                onClick={() => { setMode("notes"); setError(""); setSuccessMessage(""); }}
              >
                📄 Notes PDF
              </button>
            </div>
          </div>

          <div className="post-card-body">
            {error          && <div className="post-error">{error}</div>}
            {successMessage && <div className="post-success">{successMessage}</div>}

            {/* Book form */}
            {mode === "book" && (
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Book Title *</label>
                    <input className="form-input" type="text" name="title" placeholder="Fundamentals of Electric Circuits" value={formData.title} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Author *</label>
                    <input className="form-input" type="text" name="author" placeholder="Charles K. Alexander" value={formData.author} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Edition</label>
                    <input className="form-input" type="text" name="edition" placeholder="8th" value={formData.edition} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ISBN</label>
                    <input className="form-input" type="text" name="isbn" placeholder="978-1260570798" value={formData.isbn} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course Code</label>
                    <input className="form-input" type="text" name="course_code" placeholder="CompSci 361" value={formData.course_code} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Condition *</label>
                    <select className="form-select" name="book_condition" value={formData.book_condition} onChange={handleChange} required>
                      <option value="Like New">Like New</option>
                      <option value="Very Good">Very Good</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>
                  <div className="form-group form-full">
                    <label className="form-label">Price ($) *</label>
                    <input className="form-input" type="number" min="0" step="0.01" name="price" placeholder="25.00" value={formData.price} onChange={handleChange} required />
                  </div>
                  <div className="form-group form-full">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" name="notes" placeholder="Any highlights, wear, missing pages, access code info, etc." value={formData.notes} onChange={handleChange} />
                  </div>

                  {/* Image section */}
                  <div className="form-group form-full img-section">
                    <label className="form-label">Photos (up to 6)</label>
                    <div className="img-grid">
                      {imageSlots.map((slot, index) => (
                        <div key={index} className="img-slot">
                          <div className="img-num-badge">{index + 1}</div>
                          {slot ? (
                            <>
                              <img src={slot.previewUrl} alt={`Preview ${index + 1}`} className="img-preview" />
                              <button type="button" className="img-remove" onClick={() => removeImageAtIndex(index)} aria-label={`Remove image ${index + 1}`}>×</button>
                            </>
                          ) : (
                            <div className="img-slot-empty">Empty</div>
                          )}
                        </div>
                      ))}
                    </div>
                    <button type="button" className="upload-btn" onClick={handleUploadButtonClick}>
                      + Upload Image
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImagePick} style={{ display: "none" }} />
                    <div className="helper-text">Each new image fills the next open slot. Image 1 uploads first, then 2, etc.</div>
                  </div>
                </div>

                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? "Posting…" : "Post Listing"}
                </button>
              </form>
            )}

            {/* Notes form */}
            {mode === "notes" && (
              <form onSubmit={handleNotesSubmit}>
                <div className="form-grid">
                  <div className="form-group form-full">
                    <label className="form-label">Notes Title *</label>
                    <input className="form-input" type="text" name="title" placeholder="Exam 2 Study Guide" value={notesData.title} onChange={handleNotesChange} required />
                  </div>
                  <div className="form-group form-full">
                    <label className="form-label">Course Code</label>
                    <input className="form-input" type="text" name="course_code" placeholder="CompSci 361" value={notesData.course_code} onChange={handleNotesChange} />
                  </div>
                  <div className="form-group form-full">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" name="description" placeholder="What's covered, which professor, semester, etc." value={notesData.description} onChange={handleNotesChange} />
                  </div>
                  <div className="form-group form-full">
                    <label className="form-label">PDF File *</label>
                    <div className="pdf-zone" onClick={() => document.getElementById("pdfInput").click()}>
                      {pdfFile
                        ? <span className="pdf-zone-name">📄 {pdfFile.name}</span>
                        : <span className="pdf-zone-text">Click to select a PDF file</span>
                      }
                    </div>
                    <input id="pdfInput" type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => setPdfFile(e.target.files[0])} />
                  </div>
                </div>

                <button type="submit" className="submit-btn" disabled={submitting}>
                  {pdfUploading ? "Uploading PDF…" : submitting ? "Posting…" : "Post Notes"}
                </button>
              </form>
            )}

            <div style={{ textAlign: "center" }}>
              <a href="/booklistings" className="back-link">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M13 8H3M7 12l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to Listings
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default PostBook;