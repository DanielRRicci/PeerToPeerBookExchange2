import React, { useState, useEffect } from "react";

function Profile() {

  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {

    localStorage.setItem("userId", 1);
    const userId = localStorage.getItem("userId");

    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => setUser(data));

    fetch(`/api/listings?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setListings(data));
  }, []);

  function handleDelete(id) {
    fetch(`/api/listings/${id}`, { method: "DELETE" });
    setListings(listings.filter((book) => book.listing_id !== id));
  }

  function handleEdit(book) {
    setEditingId(book.listing_id);
    setEditData({ price: book.price, condition: book.book_condition });
  }

  function handleSave(id) {
    fetch(`/api/listings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    })
      .then((res) => res.json())
      .then((updatedBook) => {
        console.log(updatedBook);
        setListings(listings.map((book) => (book.listing_id === parseInt(id) ? updatedBook : book)));
        setEditingId(null);

      });
  }

  if (!user) return <p>Loading...</p>;

  return (
    <div>
      <h1>{user.full_name}</h1>
      <p>{user.email}</p>
      <p>{user.bio}</p>

      <h2>My Listings ({listings.length})</h2>

      {listings.map((book) => (
        <div key={book.listing_id} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
          <strong>{book.title}</strong>
          <p>{book.author} · {book.course_code}</p>

          {editingId === book.listing_id ? (
            <div>
              <input
                value={editData.price}
                onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                placeholder="Price"
              />
              <select
              value={editData.condition}
              onChange={(e) => setEditData({ ...editData, condition: e.target.value })}
            >
              <option>New</option>
              <option>Like New</option>
              <option>Good</option>
              <option>Fair</option>
              <option>Poor</option>
            </select>
              <button onClick={() => handleSave(book.listing_id)}>Save</button>
              <button onClick={() => setEditingId(null)}>Cancel</button>
            </div>
          ) : (
            <div>
              <p>{book.book_condition} · {book.price}</p>
              <button onClick={() => handleEdit(book)}>Edit</button>
              <button onClick={() => handleDelete(book.listing_id)}>Delete</button>
            </div>
          )}
        </div>
      ))}

      <a href="/booklistings">← Back to Listings</a>
    </div>
  );
}

export default Profile;