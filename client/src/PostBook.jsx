import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "./apiBaseUrl";
import { getStoredUser } from "./auth";

function PostBook() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const currentUser = getStoredUser();

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    edition: "",
    isbn: "",
    course_code: "",
    book_condition: "Good",
    price: "",
    notes: "",
  });

  const [imageSlots, setImageSlots] = useState([null, null, null, null, null, null]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    return () => {
      imageSlots.forEach((slot) => {
        if (slot?.previewUrl) {
          URL.revokeObjectURL(slot.previewUrl);
        }
      });
    };
  }, [imageSlots]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getNextOpenSlotIndex = () => {
    return imageSlots.findIndex((slot) => slot === null);
  };

  const handleUploadButtonClick = () => {
    setError("");

    const nextOpenIndex = getNextOpenSlotIndex();
    if (nextOpenIndex === -1) {
      setError("You already added 6 images.");
      return;
    }

    fileInputRef.current?.click();
  };

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    const nextOpenIndex = getNextOpenSlotIndex();
    if (nextOpenIndex === -1) {
      setError("You already added 6 images.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setImageSlots((prev) => {
      const updated = [...prev];
      updated[nextOpenIndex] = {
        file,
        previewUrl,
      };
      return updated;
    });

    setError("");
  };

  const removeImageAtIndex = (indexToRemove) => {
    setImageSlots((prev) => {
      const filledSlots = prev.filter((slot, index) => {
        if (index === indexToRemove && prev[index]?.previewUrl) {
          URL.revokeObjectURL(prev[index].previewUrl);
        }
        return index !== indexToRemove && slot !== null;
      });

      const rebuilt = [...filledSlots];
      while (rebuilt.length < 6) {
        rebuilt.push(null);
      }

      return rebuilt;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!currentUser?.id) {
      setError("You must be logged in to post a listing.");
      return;
    }

    if (!formData.title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!formData.author.trim()) {
      setError("Author is required.");
      return;
    }

    if (!formData.book_condition.trim()) {
      setError("Condition is required.");
      return;
    }

    if (formData.price === "" || Number.isNaN(Number(formData.price))) {
      setError("Enter a valid price.");
      return;
    }

    if (Number(formData.price) < 0) {
      setError("Price cannot be negative.");
      return;
    }

    setSubmitting(true);

    try {
      const baseUrl = getApiBaseUrl();

      const listingResponse = await fetch(`${baseUrl}/BookListings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          title: formData.title.trim(),
          author: formData.author.trim(),
          edition: formData.edition.trim() || null,
          isbn: formData.isbn.trim() || null,
          price: Number(formData.price),
          course_code: formData.course_code.trim() || null,
          book_condition: formData.book_condition,
          notes: formData.notes.trim() || null,
          image_url: null,
        }),
      });

      const listingData = await listingResponse.json();

      if (!listingResponse.ok) {
        throw new Error(listingData.error || listingData.message || "Failed to create listing.");
      }

      const listingId = listingData.listing_id;
      const selectedFilesInOrder = imageSlots
        .filter((slot) => slot !== null)
        .map((slot) => slot.file);

      if (selectedFilesInOrder.length > 0) {
        const imageFormData = new FormData();
        imageFormData.append("prefix", "Post_Pic");
        imageFormData.append("listingId", String(listingId));

        selectedFilesInOrder.forEach((file) => {
          imageFormData.append("images", file);
        });

        const imageResponse = await fetch(`${baseUrl}/api/images`, {
          method: "POST",
          body: imageFormData,
        });

        const imageData = await imageResponse.json();

        if (!imageResponse.ok) {
          throw new Error(
            imageData.error || imageData.message || "Listing was created, but image upload failed."
          );
        }
      }

      setSuccessMessage("Listing posted successfully.");

      setTimeout(() => {
        navigate("/booklistings");
      }, 900);
    } catch (err) {
      setError(err.message || "Something went wrong while posting your listing.");
    } finally {
      setSubmitting(false);
    }
  };

  const colors = {
    gold: "#FFBD00",
    black: "#000000",
    white: "#FFFFFF",
    darkGray: "#333333",
    lightGray: "#F4F4F4",
    midGray: "#777777",
    red: "#B00020",
    green: "#0A7A33",
  };

  const styles = {
    wrapper: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "calc(100vh - 76px)",
      width: "100vw",
      margin: 0,
      padding: "24px",
      boxSizing: "border-box",
      fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
      backgroundImage:
        'linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.55)), url("https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=2070&auto=format&fit=crop")',
      backgroundPosition: "center",
      backgroundSize: "cover",
    },
    card: {
      width: "100%",
      maxWidth: "760px",
      backgroundColor: colors.white,
      padding: "2.25rem",
      borderRadius: "12px",
      boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
      borderTop: `8px solid ${colors.gold}`,
      textAlign: "center",
    },
    mainHeading: {
      fontSize: "1.9rem",
      fontWeight: "800",
      color: colors.black,
      marginBottom: "0.5rem",
    },
    uwmBadge: {
      display: "inline-block",
      backgroundColor: colors.black,
      color: colors.gold,
      fontSize: "0.75rem",
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: "1px",
      padding: "4px 12px",
      borderRadius: "20px",
      marginBottom: "1.5rem",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "14px",
      textAlign: "left",
    },
    inputGroup: {
      textAlign: "left",
      marginBottom: "0.2rem",
    },
    fullWidth: {
      gridColumn: "1 / -1",
    },
    label: {
      display: "block",
      fontSize: "0.8rem",
      fontWeight: "700",
      marginBottom: "4px",
      color: colors.darkGray,
      textTransform: "uppercase",
    },
    input: {
      width: "100%",
      padding: "10px 15px",
      borderRadius: "6px",
      border: "2px solid #eee",
      fontSize: "1rem",
      boxSizing: "border-box",
    },
    textarea: {
      width: "100%",
      padding: "10px 15px",
      borderRadius: "6px",
      border: "2px solid #eee",
      fontSize: "1rem",
      boxSizing: "border-box",
      minHeight: "100px",
      resize: "vertical",
    },
    imageSection: {
      marginTop: "18px",
      textAlign: "left",
    },
    imageGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "12px",
      marginTop: "8px",
      marginBottom: "12px",
    },
    imageSlot: {
      position: "relative",
      width: "100%",
      aspectRatio: "1 / 1",
      border: "2px dashed #d7d7d7",
      borderRadius: "10px",
      backgroundColor: "#fafafa",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    imageSlotEmptyText: {
      color: colors.midGray,
      fontSize: "0.9rem",
      fontWeight: "600",
      textAlign: "center",
      padding: "8px",
    },
    imagePreview: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
    imageNumberBadge: {
      position: "absolute",
      top: "8px",
      left: "8px",
      backgroundColor: "rgba(0,0,0,0.75)",
      color: colors.white,
      fontSize: "0.75rem",
      fontWeight: "700",
      padding: "4px 7px",
      borderRadius: "999px",
      zIndex: 1,
    },
    removeButton: {
      position: "absolute",
      top: "8px",
      right: "8px",
      width: "28px",
      height: "28px",
      borderRadius: "50%",
      border: "none",
      backgroundColor: "rgba(0,0,0,0.75)",
      color: colors.white,
      fontWeight: "800",
      cursor: "pointer",
      zIndex: 1,
    },
    uploadButton: {
      display: "block",
      width: "100%",
      padding: "12px",
      backgroundColor: colors.lightGray,
      color: colors.black,
      border: `2px solid ${colors.black}`,
      borderRadius: "8px",
      fontWeight: "700",
      fontSize: "0.95rem",
      cursor: "pointer",
      marginTop: "2px",
    },
    helperText: {
      marginTop: "8px",
      color: colors.midGray,
      fontSize: "0.88rem",
    },
    submitButton: {
      width: "100%",
      padding: "14px",
      backgroundColor: submitting ? "#444" : colors.black,
      color: colors.gold,
      border: "none",
      borderRadius: "6px",
      fontWeight: "bold",
      fontSize: "1rem",
      cursor: submitting ? "not-allowed" : "pointer",
      marginTop: "18px",
      textTransform: "uppercase",
    },
    footerLink: {
      marginTop: "1.5rem",
      fontSize: "0.9rem",
      color: "#555",
    },
    link: {
      color: colors.black,
      fontWeight: "bold",
      textDecoration: "none",
      borderBottom: `2px solid ${colors.gold}`,
    },
    messageError: {
      backgroundColor: "#ffe8ec",
      color: colors.red,
      border: "1px solid #f3b8c4",
      borderRadius: "8px",
      padding: "10px 12px",
      marginBottom: "1rem",
      textAlign: "left",
      fontSize: "0.95rem",
    },
    messageSuccess: {
      backgroundColor: "#e8f7ec",
      color: colors.green,
      border: "1px solid #b8e3c3",
      borderRadius: "8px",
      padding: "10px 12px",
      marginBottom: "1rem",
      textAlign: "left",
      fontSize: "0.95rem",
    },
    hiddenInput: {
      display: "none",
    },
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.mainHeading}>Post a Book</h1>
        <div style={styles.uwmBadge}>Listings</div>

        {error && <div style={styles.messageError}>{error}</div>}
        {successMessage && <div style={styles.messageSuccess}>{successMessage}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Book Title *</label>
              <input
                style={styles.input}
                type="text"
                name="title"
                placeholder="Fundamentals of Electric Circuits"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Author *</label>
              <input
                style={styles.input}
                type="text"
                name="author"
                placeholder="Charles K. Alexander"
                value={formData.author}
                onChange={handleChange}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Edition</label>
              <input
                style={styles.input}
                type="text"
                name="edition"
                placeholder="8th"
                value={formData.edition}
                onChange={handleChange}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>ISBN</label>
              <input
                style={styles.input}
                type="text"
                name="isbn"
                placeholder="978-1260570798"
                value={formData.isbn}
                onChange={handleChange}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Course Code</label>
              <input
                style={styles.input}
                type="text"
                name="course_code"
                placeholder="CompSci 361"
                value={formData.course_code}
                onChange={handleChange}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Condition *</label>
              <select
                style={styles.input}
                name="book_condition"
                value={formData.book_condition}
                onChange={handleChange}
                required
              >
                <option value="Like New">Like New</option>
                <option value="Very Good">Very Good</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Price ($) *</label>
              <input
                style={styles.input}
                type="number"
                min="0"
                step="0.01"
                name="price"
                placeholder="25.00"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </div>

            <div style={{ ...styles.inputGroup, ...styles.fullWidth }}>
              <label style={styles.label}>Notes</label>
              <textarea
                style={styles.textarea}
                name="notes"
                placeholder="Any highlights, wear, missing pages, access code info, etc."
                value={formData.notes}
                onChange={handleChange}
              />
            </div>

            <div style={{ ...styles.fullWidth, ...styles.imageSection }}>
              <label style={styles.label}>Photos (up to 6)</label>

              <div style={styles.imageGrid}>
                {imageSlots.map((slot, index) => (
                  <div key={index} style={styles.imageSlot}>
                    <div style={styles.imageNumberBadge}>{index + 1}</div>

                    {slot ? (
                      <>
                        <img
                          src={slot.previewUrl}
                          alt={`Book preview ${index + 1}`}
                          style={styles.imagePreview}
                        />
                        <button
                          type="button"
                          style={styles.removeButton}
                          onClick={() => removeImageAtIndex(index)}
                          aria-label={`Remove image ${index + 1}`}
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <div style={styles.imageSlotEmptyText}>Empty</div>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                style={styles.uploadButton}
                onClick={handleUploadButtonClick}
              >
                Upload Image
              </button>

              <input
                ref={fileInputRef}
                style={styles.hiddenInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImagePick}
              />

              <div style={styles.helperText}>
                Each new image fills the next open space. Image 1 uploads first, then 2, then 3, and so on.
              </div>
            </div>
          </div>

          <button type="submit" style={styles.submitButton} disabled={submitting}>
            {submitting ? "Posting..." : "Post Listing"}
          </button>
        </form>

        <div style={styles.footerLink}>
          Back to <a href="/booklistings" style={styles.link}>Listings</a>
        </div>
      </div>
    </div>
  );
}

export default PostBook;