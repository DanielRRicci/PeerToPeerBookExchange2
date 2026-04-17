import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";
import { getStoredUser } from "./auth";

// CHANGED: Added the full UWM Department list for the dropdowns
const DEPARTMENT_OPTIONS = [
  { value: "ACTSCI", label: "Actuarial Science (ACTSCI)" },
  { value: "AD LDSP", label: "Administrative Leadership (AD LDSP)" },
  { value: "AFRIC", label: "African and African Diaspora Studies (AFRIC)" },
  { value: "AFAS", label: "Air Force and Aerospace Studies (AFAS)" },
  { value: "AIS", label: "American Indian Studies (AIS)" },
  { value: "ASL", label: "American Sign Language (ASL)" },
  { value: "AMLLC", label: "Ancient and Modern Languages, Literatures and Cultures (AMLLC)" },
  { value: "ANTHRO", label: "Anthropology (ANTHRO)" },
  { value: "APC", label: "Applied Computing (APC)" },
  { value: "ARABIC", label: "Arabic (ARABIC)" },
  { value: "ARCH", label: "Architecture (ARCH)" },
  { value: "ART", label: "Art and Design (ART)" },
  { value: "ART ED", label: "Art Education (ART ED)" },
  { value: "ARTHIST", label: "Art History (ARTHIST)" },
  { value: "ASTRON", label: "Astronomy (ASTRON)" },
  { value: "ATRAIN", label: "Athletic Training (ATRAIN)" },
  { value: "ATM SCI", label: "Atmospheric Sciences (ATM SCI)" },
  { value: "BIO SCI", label: "Biological Sciences (BIO SCI)" },
  { value: "BME", label: "Biomedical Engineering (BME)" },
  { value: "BMS", label: "Biomedical Sciences (BMS)" },
  { value: "BUS ADM", label: "Business Administration (BUS ADM)" },
  { value: "BUSMGMT", label: "Business Management (BUSMGMT)" },
  { value: "CELTIC", label: "Celtic Studies (CELTIC)" },
  { value: "CGS ANT", label: "CGS Anthropology (CGS ANT)" },
  { value: "CGS ART", label: "CGS Art (CGS ART)" },
  { value: "CGS BIO", label: "CGS Biology (CGS BIO)" },
  { value: "CGS BUS", label: "CGS Business (CGS BUS)" },
  { value: "CGS CHE", label: "CGS Chemistry (CGS CHE)" },
  { value: "CGS CTA", label: "CGS Communication Arts and Theatre (CGS CTA)" },
  { value: "CGS ENG", label: "CGS English (CGS ENG)" },
  { value: "CGS GSW", label: "CGS Gender, Sexuality, and Women's Studies (CGS GSW)" },
  { value: "CGS GEO", label: "CGS Geography (CGS GEO)" },
  { value: "CGS HES", label: "CGS Health and Exercise Sciences (CGS HES)" },
  { value: "CGS HIS", label: "CGS History (CGS HIS)" },
  { value: "CGS INT", label: "CGS Interdisciplinary Studies (CGS INT)" },
  { value: "CGS MAT", label: "CGS Mathematics (CGS MAT)" },
  { value: "CGS MUS", label: "CGS Music (CGS MUS)" },
  { value: "CGS POL", label: "CGS Political Science (CGS POL)" },
  { value: "CGS PSY", label: "CGS Psychology (CGS PSY)" },
  { value: "CGS REL", label: "CGS Religious Studies (CGS REL)" },
  { value: "CGS SOC", label: "CGS Sociology (CGS SOC)" },
  { value: "CGS SPA", label: "CGS Spanish (CGS SPA)" },
  { value: "CHEM", label: "Chemistry and Biochemistry (CHEM)" },
  { value: "CHINESE", label: "Chinese (CHINESE)" },
  { value: "CIV ENG", label: "Civil and Environmental Engineering (CIV ENG)" },
  { value: "CLASSIC", label: "Classics (CLASSIC)" },
  { value: "CHPS", label: "College of Health Professions and Sciences (CHPS)" },
  { value: "COMMUN", label: "Communication (COMMUN)" },
  { value: "COMSDIS", label: "Communication Sciences and Disorders (COMSDIS)" },
  { value: "COMPLIT", label: "Comparative Literature (COMPLIT)" },
  { value: "COMPSCI", label: "Computer Science (COMPSCI)" },
  { value: "COMPST", label: "Computer Studies (COMPST)" },
  { value: "CES", label: "Conservation and Environmental Sciences (CES)" },
  { value: "COUNS", label: "Counseling (COUNS)" },
  { value: "CRM JST", label: "Criminal Justice and Criminology (CRM JST)" },
  { value: "CURRINS", label: "Curriculum and Instruction (CURRINS)" },
  { value: "DANCE", label: "Dance (DANCE)" },
  { value: "DMI", label: "Diagnostic Imaging (DMI)" },
  { value: "DAC", label: "Digital Arts and Culture (DAC)" },
  { value: "ECON", label: "Economics (ECON)" },
  { value: "EDUC", label: "Education-Interdepartmental (EDUC)" },
  { value: "ED POL", label: "Educational Policy and Community Studies (ED POL)" },
  { value: "ED PSY", label: "Educational Psychology (ED PSY)" },
  { value: "ELECENG", label: "Electrical Engineering (ELECENG)" },
  { value: "EAS", label: "Engineering and Applied Science (EAS)" },
  { value: "ENGLISH", label: "English (ENGLISH)" },
  { value: "EAP", label: "English for Academic Purposes (EAP)" },
  { value: "ETHNIC", label: "Ethnic Studies, Comparative (ETHNIC)" },
  { value: "EXCEDUC", label: "Exceptional Education (EXCEDUC)" },
  { value: "FILMSTD", label: "Film Studies (FILMSTD)" },
  { value: "FILM", label: "Film, Video, Animation and New Genres (FILM)" },
  { value: "FITWELL", label: "Fitness, Wellness and Sport (FITWELL)" },
  { value: "FOODBEV", label: "Food and Beverage Studies (FOODBEV)" },
  { value: "FRENCH", label: "French (FRENCH)" },
  { value: "FRSHWTR", label: "Freshwater Sciences (FRSHWTR)" },
  { value: "GEOG", label: "Geography (GEOG)" },
  { value: "GEO SCI", label: "Geosciences (GEO SCI)" },
  { value: "GERMAN", label: "German (GERMAN)" },
  { value: "GLOBAL", label: "Global Studies (GLOBAL)" },
  { value: "GRAD", label: "Graduate Studies (GRAD)" },
  { value: "GREEK", label: "Greek (GREEK)" },
  { value: "HCA", label: "Health Care Administration (HCA)" },
  { value: "HI", label: "Health Care Informatics (HI)" },
  { value: "HEBREW", label: "Hebrew (HEBREW)" },
  { value: "HIST", label: "History (HIST)" },
  { value: "HMONG", label: "Hmong Studies (HMONG)" },
  { value: "HONORS", label: "Honors College (HONORS)" },
  { value: "IND REL", label: "Industrial and Labor Relations (IND REL)" },
  { value: "IND ENG", label: "Industrial and Manufacturing Engineering (IND ENG)" },
  { value: "INFOST", label: "Information Studies (INFOST)" },
  { value: "INTLST", label: "International Studies (INTLST)" },
  { value: "ITALIAN", label: "Italian (ITALIAN)" },
  { value: "JAPAN", label: "Japanese (JAPAN)" },
  { value: "JEWISH", label: "Jewish Studies (JEWISH)" },
  { value: "JAMS", label: "Journalism, Advertising, and Media Studies (JAMS)" },
  { value: "KIN", label: "Kinesiology (KIN)" },
  { value: "KOREAN", label: "Korean (KOREAN)" },
  { value: "LATIN", label: "Latin (LATIN)" },
  { value: "LACS", label: "Latin American and Caribbean Studies (LACS)" },
  { value: "LACUSL", label: "Latin American, Caribbean, and U.S. Latinx Studies (LACUSL)" },
  { value: "LATINX", label: "Latinx Studies (LATINX)" },
  { value: "LGBT", label: "Lesbian, Gay, Bisexual, and Transgender Studies (LGBT)" },
  { value: "L&S HUM", label: "Letters and Science-Humanities (L&S HUM)" },
  { value: "L&S NS", label: "Letters and Science-Natural Science (L&S NS)" },
  { value: "L&S SS", label: "Letters and Science-Social Sciences (L&S SS)" },
  { value: "LINGUIS", label: "Linguistics (LINGUIS)" },
  { value: "MATLENG", label: "Materials Science and Engineering (MATLENG)" },
  { value: "MATH", label: "Mathematical Sciences (MATH)" },
  { value: "MTHSTAT", label: "Mathematical Statistics (MTHSTAT)" },
  { value: "MECHENG", label: "Mechanical Engineering (MECHENG)" },
  { value: "MIL SCI", label: "Military Science (MIL SCI)" },
  { value: "MUSIC", label: "Music (MUSIC)" },
  { value: "MUS ED", label: "Music Education (MUS ED)" },
  { value: "MUSPERF", label: "Music Performance (MUSPERF)" },
  { value: "NEURO", label: "Neuroscience (NEURO)" },
  { value: "NONPROF", label: "Nonprofit Administration (NONPROF)" },
  { value: "NURS", label: "Nursing (NURS)" },
  { value: "NUTR", label: "Nutritional Sciences (NUTR)" },
  { value: "OCCTHPY", label: "Occupational Therapy (OCCTHPY)" },
  { value: "PEACEST", label: "Peace Studies (PEACEST)" },
  { value: "PRPP", label: "Performance Rehabilitation and Performance Psychology (PRPP)" },
  { value: "PHILOS", label: "Philosophy (PHILOS)" },
  { value: "PT", label: "Physical Therapy (PT)" },
  { value: "PHYSICS", label: "Physics (PHYSICS)" },
  { value: "POLISH", label: "Polish (POLISH)" },
  { value: "POL SCI", label: "Political Science (POL SCI)" },
  { value: "PORTUGS", label: "Portuguese (PORTUGS)" },
  { value: "PSYCH", label: "Psychology (PSYCH)" },
  { value: "PUB ADM", label: "Public Administration (PUB ADM)" },
  { value: "PH", label: "Public Health (PH)" },
  { value: "RELIGST", label: "Religious Studies (RELIGST)" },
  { value: "RUSSIAN", label: "Russian (RUSSIAN)" },
  { value: "SOC WRK", label: "Social Work (SOC WRK)" },
  { value: "SOCIOL", label: "Sociology (SOCIOL)" },
  { value: "SPANISH", label: "Spanish (SPANISH)" },
  { value: "MSP", label: "Sustainable Peacebuilding, Master of (MSP)" },
  { value: "TCH LRN", label: "Teaching and Learning (TCH LRN)" },
  { value: "THEATRE", label: "Theatre (THEATRE)" },
  { value: "THERREC", label: "Therapeutic Recreation (THERREC)" },
  { value: "TRNSLTN", label: "Translation and Interpreting (TRNSLTN)" },
  { value: "URBPLAN", label: "Urban Planning (URBPLAN)" },
  { value: "URB STD", label: "Urban Studies Program (URB STD)" },
  { value: "UWS NSG", label: "UWS Collaborative Nursing Program (UWS NSG)" },
  { value: "WGS", label: "Women's and Gender Studies (WGS)" },
  { value: "WLC", label: "World Languages and Cultures (WLC)" }
];

function fileTypeLabel(mimeType) {
  if (!mimeType) return "File";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType === "text/csv" || mimeType === "application/vnd.ms-excel") return "CSV";
  if (
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) return "PowerPoint";
  return "File";
}

const ALLOWED_NOTE_TYPES = [
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "audio/mpeg", "audio/wav",
  "text/csv", "application/vnd.ms-excel",
  "video/mp4", "video/quicktime",
];

const ALLOWED_NOTE_ACCEPT = [
  "application/pdf",
  "image/jpeg,image/png,image/webp,image/gif",
  "text/csv,.csv",
  "audio/mpeg,audio/wav",
  "video/mp4,video/quicktime",
  "application/vnd.ms-powerpoint,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx",
].join(",");

function PostBook() {
  const navigate    = useNavigate();
  const imgInputRef = useRef(null);
  const currentUser = getStoredUser();

  const [mode, setMode] = useState("book");
  
  // CHANGED: Replaced 'course_code' with 'course_dept' and 'course_num'
  const [formData, setFormData] = useState({
    title: "", author: "", edition: "", isbn: "",
    course_dept: "", course_num: "", book_condition: "Good", price: "", notes: "",
  });

  // Images stored as array of { file, previewUrl } — max 6
  const [images,       setImages]       = useState([]);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // CHANGED: Replaced 'course_code' with 'course_dept' and 'course_num'
  const [notesData,         setNotesData]         = useState({ title: "", course_dept: "", course_num: "", description: "" });
  const [noteFile,          setNoteFile]           = useState(null);
  const [noteFileUploading, setNoteFileUploading]  = useState(false);

  // Revoke preview URLs on unmount
  useEffect(() => {
    return () => { images.forEach((img) => URL.revokeObjectURL(img.previewUrl)); };
  }, [images]);

  const handleChange      = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleNotesChange = (e) => setNotesData((p) => ({ ...p, [e.target.name]: e.target.value }));

  function handleImageZoneClick() {
    setError("");
    if (images.length >= 6) { setError("You can upload a maximum of 6 photos."); return; }
    imgInputRef.current?.click();
  }

  function handleImagePick(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const remaining = 6 - images.length;
    const toAdd = files.slice(0, remaining);

    const newImages = toAdd.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...newImages]);

    if (files.length > remaining) {
      setError(`Only ${remaining} more image${remaining === 1 ? "" : "s"} allowed. First ${remaining} selected.`);
    } else {
      setError("");
    }
  }

  function removeImage(index) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  const handleNoteFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_NOTE_TYPES.includes(file.type)) {
      setError("Unsupported file type. Please upload a PDF, image, audio, video, or CSV.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }
    setNoteFile(file);
    setError("");
  };

  const handleNotesSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccessMessage("");
    if (!currentUser?.id)        { setError("You must be logged in to post notes."); return; }
    if (!notesData.title.trim()) { setError("Title is required."); return; }
    if (!noteFile)               { setError("Please select a file."); return; }
    if (noteFile.size > 10 * 1024 * 1024) { setError("File too large. Maximum size is 10MB."); return; }

    // CHANGED: Combine the selected department and typed number together
    const finalCourseCode = [notesData.course_dept, notesData.course_num].filter(Boolean).join(" ").trim() || null;

    setSubmitting(true); setNoteFileUploading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const urlRes  = await fetch(
        `${baseUrl}/api/upload-url?filename=${encodeURIComponent(noteFile.name)}&contentType=${encodeURIComponent(noteFile.type)}&folder=Notes`
      );
      const { uploadUrl, publicUrl } = await urlRes.json();

      await fetch(uploadUrl, { method: "PUT", body: noteFile, headers: { "Content-Type": noteFile.type } });
      setNoteFileUploading(false);

      const notesRes = await fetch(`${baseUrl}/Notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUser.id,
          title: notesData.title.trim(),
          course_code: finalCourseCode, // Uses the combined string
          description: notesData.description.trim() || null,
          file_url: publicUrl,
          file_type: noteFile.type,
        }),
      });

      const notesJson = await notesRes.json();
      if (!notesRes.ok) throw new Error(notesJson.error || "Failed to post notes.");
      setSuccessMessage("Notes posted successfully!");
      setTimeout(() => navigate("/booklistings"), 900);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false); setNoteFileUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccessMessage("");
    if (!currentUser?.id)                                               { setError("You must be logged in to post a listing."); return; }
    if (!formData.title.trim())                                         { setError("Title is required."); return; }
    if (!formData.author.trim())                                        { setError("Author is required."); return; }
    if (!formData.book_condition.trim())                                { setError("Condition is required."); return; }
    if (formData.price === "" || Number.isNaN(Number(formData.price))) { setError("Enter a valid price."); return; }
    if (Number(formData.price) < 0)                                    { setError("Price cannot be negative."); return; }

    // CHANGED: Combine the selected department and typed number together
    const finalCourseCode = [formData.course_dept, formData.course_num].filter(Boolean).join(" ").trim() || null;

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
          price: Number(formData.price), 
          course_code: finalCourseCode, // Uses the combined string
          book_condition: formData.book_condition, notes: formData.notes.trim() || null,
          image_url: null,
        }),
      });
      const listingData = await listingResponse.json();
      if (!listingResponse.ok) throw new Error(listingData.error || listingData.message || "Failed to create listing.");

      const listingId = listingData.listing_id;

      if (images.length > 0) {
        const imageFormData = new FormData();
        imageFormData.append("prefix", "Post_Pic");
        imageFormData.append("listingId", String(listingId));
        images.forEach((img) => imageFormData.append("images", img.file));
        const imageResponse = await fetch(`${baseUrl}/api/images`, { method: "POST", body: imageFormData });
        const imageData = await imageResponse.json();
        if (!imageResponse.ok) throw new Error(imageData.error || imageData.message || "Listing created, but image upload failed.");
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
          min-height: calc(100vh - 64px); width: 100vw;
          display: flex; align-items: flex-start; justify-content: center;
          font-family: 'DM Sans', sans-serif; position: relative;
          padding: 2.5rem 1.5rem;
          background:
            linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)),
            url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2128&auto=format&fit=crop') center/cover no-repeat fixed;
        }
        .post-page::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 60% 50% at 20% 50%, rgba(255,189,0,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 80% 30%, rgba(255,189,0,0.04) 0%, transparent 50%);
        }
        .post-page::after {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,189,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,189,0,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .post-card {
          position: relative; z-index: 1; width: 100%; max-width: 780px;
          background: #fff; border-radius: 20px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,189,0,0.12);
          overflow: hidden;
        }

        .post-card-header { background: #0a0a0a; padding: 28px 36px 24px; border-bottom: 3px solid #FFBD00; }
        .post-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: rgba(255,189,0,0.6); margin-bottom: 6px; }
        .post-heading { font-family: 'Bebas Neue', sans-serif; font-size: 42px; letter-spacing: 2px; color: #FFBD00; line-height: 1; margin-bottom: 18px; }

        .mode-toggle { display: flex; border-radius: 8px; overflow: hidden; border: 2px solid rgba(255,189,0,0.3); width: fit-content; }
        .mode-btn { padding: 8px 22px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; border: none; cursor: pointer; transition: background 0.18s, color 0.18s; }
        .mode-btn.active  { background: #FFBD00; color: #0a0a0a; }
        .mode-btn.inactive { background: transparent; color: rgba(255,255,255,0.5); }
        .mode-btn.inactive:hover { color: rgba(255,255,255,0.85); }

        .post-card-body { padding: 28px 36px 32px; }

        .post-error   { padding: 10px 14px; background: #fef2f2; border-left: 3px solid #dc2626; border-radius: 6px; color: #dc2626; font-size: 13px; margin-bottom: 18px; }
        .post-success { padding: 10px 14px; background: #f0fdf4; border-left: 3px solid #22c55e; border-radius: 6px; color: #15803d; font-size: 13px; margin-bottom: 18px; font-weight: 600; }

        .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .form-full  { grid-column: 1 / -1; }
        .form-group { display: flex; flex-direction: column; }
        .form-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #666; margin-bottom: 5px; }
        .form-input, .form-select, .form-textarea {
          padding: 10px 13px; border: 1.5px solid #e8e8e8; border-radius: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; color: #0a0a0a;
          background: #fafafa; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s; width: 100%;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #FFBD00; background: #fff; box-shadow: 0 0 0 3px rgba(255,189,0,0.12);
        }
        .form-textarea { min-height: 100px; resize: vertical; }

        /* CHANGED: New split layout class for Dept + Course Number */
        .course-split { display: flex; gap: 8px; width: 100%; }

        /* ── Image upload zone (matches notes file zone) ── */
        .img-upload-zone {
          border: 2px dashed #e8e8e8; border-radius: 10px;
          padding: 24px; text-align: center; background: #fafafa;
          cursor: pointer; transition: border-color 0.2s, background 0.2s; margin-top: 6px;
        }
        .img-upload-zone:hover { border-color: #FFBD00; background: #fff; }
        .img-upload-zone.has-images { padding: 16px; text-align: left; }
        .img-upload-zone-hint { color: #aaa; font-size: 13px; }
        .img-upload-zone-sub  { color: #bbb; font-size: 11px; margin-top: 6px; }

        /* Thumbnail strip */
        .img-thumb-strip { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
        .img-thumb {
          position: relative; width: 72px; height: 72px;
          border-radius: 8px; overflow: hidden;
          border: 2px solid #e8e8e8; background: #f0f0f0; flex-shrink: 0;
        }
        .img-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .img-thumb-num {
          position: absolute; top: 4px; left: 4px;
          background: rgba(0,0,0,0.7); color: #fff;
          font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 999px;
        }
        .img-thumb-remove {
          position: absolute; top: 4px; right: 4px;
          width: 18px; height: 18px; border-radius: 50%;
          background: rgba(0,0,0,0.7); color: #fff;
          border: none; cursor: pointer; font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }
        .img-add-more {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 700; color: #888;
          background: #f0f0f0; border: 1.5px dashed #ddd;
          border-radius: 8px; padding: 6px 12px; cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .img-add-more:hover { border-color: #FFBD00; color: #0a0a0a; }

        /* Notes file zone */
        .file-zone {
          border: 2px dashed #e8e8e8; border-radius: 10px; padding: 24px;
          text-align: center; background: #fafafa; cursor: pointer;
          transition: border-color 0.2s, background 0.2s; margin-top: 6px;
        }
        .file-zone:hover { border-color: #FFBD00; background: #fff; }
        .file-zone-text  { color: #aaa; font-size: 13px; }
        .file-zone-name  { font-weight: 700; color: #0a0a0a; font-size: 13px; }
        .file-zone-type  { font-size: 11px; color: #888; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .file-zone-types { color: #bbb; font-size: 11px; margin-top: 6px; }

        .submit-btn {
          width: 100%; padding: 14px; background: #0a0a0a; color: #FFBD00;
          border: none; border-radius: 8px;
          font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 2px;
          cursor: pointer; margin-top: 20px; transition: background 0.2s, transform 0.15s;
        }
        .submit-btn:hover:not(:disabled) { background: #222; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .back-link {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
          color: #aaa; text-decoration: none; margin-top: 18px; transition: color 0.2s;
        }
        .back-link:hover { color: #FFBD00; }

        @media (max-width: 640px) {
          .post-page { padding: 1rem 0.75rem; }
          .post-card-header { padding: 20px 18px 18px; }
          .post-heading { font-size: 32px; }
          .post-card-body { padding: 18px 18px 24px; }
          .form-grid { grid-template-columns: 1fr; }
          .mode-toggle { width: 100%; }
          .mode-btn { flex: 1; text-align: center; padding: 10px 8px; }
        }
      `}</style>

      <div className="post-page">
        <div className="post-card">

          <div className="post-card-header">
            <div className="post-eyebrow">UWM Student Marketplace</div>
            <div className="post-heading">{mode === "book" ? "Post a Book" : "Upload Notes"}</div>
            <div className="mode-toggle">
              <button type="button" className={`mode-btn ${mode === "book" ? "active" : "inactive"}`} onClick={() => { setMode("book"); setError(""); setSuccessMessage(""); }}>Book</button>
              <button type="button" className={`mode-btn ${mode === "notes" ? "active" : "inactive"}`} onClick={() => { setMode("notes"); setError(""); setSuccessMessage(""); }}>Notes</button>
            </div>
          </div>

          <div className="post-card-body">
            {error          && <div className="post-error">{error}</div>}
            {successMessage && <div className="post-success">{successMessage}</div>}

            {/* ── Book form ── */}
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

                  {/* CHANGED: Replaced Course Code text input with Dropdown + Number split */}
                  <div className="form-group">
                    <label className="form-label">Course</label>
                    <div className="course-split">
                      <select 
                        className="form-select" 
                        name="course_dept" 
                        value={formData.course_dept} 
                        onChange={handleChange} 
                        style={{ flex: 3 }}
                      >
                        <option value="">Department</option>
                        {DEPARTMENT_OPTIONS.map((dept) => (
                          <option key={dept.value} value={dept.value}>{dept.label}</option>
                        ))}
                      </select>
                      <input 
                        className="form-input" 
                        type="text" 
                        name="course_num" 
                        placeholder="e.g. 315" 
                        value={formData.course_num} 
                        onChange={handleChange} 
                        style={{ flex: 1 }} 
                      />
                    </div>
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

                  {/* ── New image upload zone ── */}
                  <div className="form-group form-full">
                    <label className="form-label">Photos (up to 6)</label>
                    <div
                      className={`img-upload-zone${images.length > 0 ? " has-images" : ""}`}
                      onClick={images.length < 6 ? handleImageZoneClick : undefined}
                      style={{ cursor: images.length >= 6 ? "default" : "pointer" }}
                    >
                      {images.length === 0 ? (
                        <>
                          <div className="img-upload-zone-hint">Click to add photos</div>
                          <div className="img-upload-zone-sub">JPG · PNG · WEBP — Up to 6 photos</div>
                        </>
                      ) : (
                        <>
                          <div className="img-thumb-strip">
                            {images.map((img, i) => (
                              <div key={i} className="img-thumb">
                                <div className="img-thumb-num">{i + 1}</div>
                                <img src={img.previewUrl} alt={`Photo ${i + 1}`} />
                                <button
                                  type="button"
                                  className="img-thumb-remove"
                                  onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                                >×</button>
                              </div>
                            ))}
                            {images.length < 6 && (
                              <div className="img-add-more" onClick={(e) => { e.stopPropagation(); handleImageZoneClick(); }}>
                                + Add more
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "#bbb" }}>{images.length} / 6 photos added</div>
                        </>
                      )}
                    </div>
                    <input
                      ref={imgInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleImagePick}
                      style={{ display: "none" }}
                    />
                  </div>
                </div>
                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? "Posting…" : "Post Listing"}
                </button>
              </form>
            )}

            {/* ── Notes form ── */}
            {mode === "notes" && (
              <form onSubmit={handleNotesSubmit}>
                <div className="form-grid">
                  <div className="form-group form-full">
                    <label className="form-label">Title *</label>
                    <input className="form-input" type="text" name="title" placeholder="Exam 2 Study Guide" value={notesData.title} onChange={handleNotesChange} required />
                  </div>
                  
                  {/* CHANGED: Replaced Course Code text input with Dropdown + Number split */}
                  <div className="form-group form-full">
                    <label className="form-label">Course</label>
                    <div className="course-split">
                      <select 
                        className="form-select" 
                        name="course_dept" 
                        value={notesData.course_dept} 
                        onChange={handleNotesChange} 
                        style={{ flex: 3 }}
                      >
                        <option value="">Department</option>
                        {DEPARTMENT_OPTIONS.map((dept) => (
                          <option key={dept.value} value={dept.value}>{dept.label}</option>
                        ))}
                      </select>
                      <input 
                        className="form-input" 
                        type="text" 
                        name="course_num" 
                        placeholder="e.g. 315" 
                        value={notesData.course_num} 
                        onChange={handleNotesChange} 
                        style={{ flex: 1 }} 
                      />
                    </div>
                  </div>

                  <div className="form-group form-full">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" name="description" placeholder="What's covered, which professor, semester, etc." value={notesData.description} onChange={handleNotesChange} />
                  </div>
                  <div className="form-group form-full">
                    <label className="form-label">File *</label>
                    <div className="file-zone" onClick={() => document.getElementById("noteFileInput").click()}>
                      {noteFile ? (
                        <>
                          <span className="file-zone-name">{noteFile.name}</span>
                          <div className="file-zone-type">{fileTypeLabel(noteFile.type)}</div>
                        </>
                      ) : (
                        <>
                          <span className="file-zone-text">Click to select a file</span>
                          <div className="file-zone-types">PDF · Image · Audio · GIF · Video · CSV · PowerPoint — Max 10MB</div>
                        </>
                      )}
                    </div>
                    <input id="noteFileInput" type="file" accept={ALLOWED_NOTE_ACCEPT} style={{ display: "none" }} onChange={handleNoteFileChange} />
                  </div>
                </div>
                <button type="submit" className="submit-btn" disabled={submitting}>
                  {noteFileUploading ? "Uploading File…" : submitting ? "Posting…" : "Post Notes"}
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