import React, { useState, useEffect } from 'react'
import '../styles/category.css';

const Category = (props) => {
  const [categoryDetails, setcategoryDetails] = useState({ cName: "", cDesc: "" });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editDetails, setEditDetails] = useState({ cName: "", cDesc: "" });

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  });

  const fetchCategories = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/category/getcategory", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': localStorage.getItem('token')
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: Status ${response.status}`, errorText);
        props.showAlert(`Failed to fetch categories (Status ${response.status})`, "danger");
        setLoading(false);
        return;
      }
      const json = await response.json();
      setCategories(json);
      setLoading(false);
    } catch (error) {
      console.error("Network or Parsing Error:", error);
      props.showAlert("Failed to fetch categories", "danger");
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    const { cName, cDesc } = categoryDetails;
    try {
      const response = await fetch("http://localhost:5000/api/category/createcategory", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ cName, cDesc })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: Status ${response.status}`, errorText);
        props.showAlert(`Category creation failed (Status ${response.status}). Check server logs.`, "danger");
        return;
      }
      const json = await response.json();
      if (json.success) {
        setcategoryDetails({
          cName: "", cDesc: ""
        });
        props.showAlert("Category Created Successfully", "success");
        fetchCategories(); // Refresh the categories list
      } else {
        props.showAlert(json.message || "Invalid Credentials or server error.", "danger");
      }
    } catch (error) {
      console.error("Network or Parsing Error:", error);
      props.showAlert("An unexpected network error occurred.", "danger");
    }
  }
  const onChange = (e) => {
    e.preventDefault()
    setcategoryDetails({ ...categoryDetails, [e.target.name]: e.target.value });
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  }

  const filteredCategories = categories.filter((category) => 
    category.cName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.cDesc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleShowCategory = (category) => {
    setSelectedCategory(category);
  };

  const handleEditCategory = async () => {
    if (!selectedCategory) return;
    try {
      const response = await fetch(`http://localhost:5000/api/category/updatecategory/${selectedCategory._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify(editDetails)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: Status ${response.status}`, errorText);
        props.showAlert(`Failed to update category (Status ${response.status})`, "danger");
        return;
      }
      props.showAlert("Category updated successfully", "success");
      fetchCategories();
      setSelectedCategory(null);
    } catch (error) {
      console.error("Network or Parsing Error:", error);
      props.showAlert("Failed to update category", "danger");
    }
  };

  const handleOnEditChange = (e) => {
    setEditDetails({ ...editDetails, [e.target.name]: e.target.value });
  };

  const openEditModal = () => {
    if (selectedCategory) {
      setEditDetails({ cName: selectedCategory.cName, cDesc: selectedCategory.cDesc });
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedCategory.cName}?`)) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/category/deletecategory/${selectedCategory._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': localStorage.getItem('token')
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: Status ${response.status}`, errorText);
        props.showAlert(`Failed to delete category (Status ${response.status})`, "danger");
        return;
      }
      props.showAlert("Category deleted successfully", "success");
      fetchCategories();
      setSelectedCategory(null);
    } catch (error) {
      console.error("Network or Parsing Error:", error);
      props.showAlert("Failed to delete category", "danger");
    }
  };
  return (
    <>
      <div id="page-main" className="container-fluid bg-light p-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="header-left">
            <h1 className="categories-title mb-3">Categories</h1>
            <p className="text-muted last-update-text">Last Update 7 Aug, 2025 at 11:00 PM</p>
          </div>
          <button className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addCategoryModal">
            <i className="bi bi-plus"></i> Add Category
          </button>
        </div>

        <div className="modal fade" id="addCategoryModal" tabIndex="-1" aria-labelledby="exampleModalLabel"
          aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h1 className="modal-title fs-3" id="exampleModalLabel">Add Category</h1>
                <button type="button" className="btn-close bg-danger rounded-circle p-2"
                  data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body p-4">
                <form>
                  <div className="mb-3">
                    <label htmlFor="categoryName" className="form-label">Category Name</label>
                    <input type="text" className="form-control shadow-sm" name='cName' id="categoryName" value={categoryDetails.cName} onChange={onChange}/>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="categoryDesc" className="form-label">Category Description</label>
                    <input type="text" className="form-control shadow-sm" name='cDesc' id="categoryDesc" value={categoryDetails.cDesc} onChange={onChange}/>
                  </div>
                </form>
              </div>
              <div className="modal-footer justify-content-start p-3">
                <button type="button" className="btn btn-primary" onClick={handleAddCategory} data-bs-dismiss="modal">Add Category</button>
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5">
          <div className="input-group rounded-pill p-2 search-bar-container shadow">
            <span className="input-group-text search-icon-bg bg-transparent fw-medium text-secondary" id="search-addon"><i
              className="bi bi-search"></i></span>
            <input type="text" className="form-control search-input bg-transparent fw-medium text-secondary"
              placeholder="Search categories" aria-label="Search" aria-describedby="search-addon" value={searchTerm} onChange={handleSearch} />
          </div>
        </div>

        <div className="row g-4 mt-5">
          {loading ? (
            <div className="col-12">
              <p className="text-center text-muted">Loading categories...</p>
            </div>
          ) : filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <div key={category._id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                <div className="card shadow border border-3 rounded-4 h-100 category-card" data-bs-toggle="modal" data-bs-target="#descCategoryModal" onClick={() => handleShowCategory(category)} style={{ cursor: 'pointer' }}>
                  <div className="card-body p-0">
                    <div
                      className="category-image-placeholder m-3 rounded-4 d-flex justify-content-center align-items-center">
                      <i className="bi bi-inbox-fill category-icon"></i>
                    </div>
                    <div className="ps-3 pb-3 pe-3">
                      <h5 className="card-title mb-1">{category.cName}</h5>
                      <p className="card-text text-muted">{category.cDesc}</p>
                      <div className="category-actions mt-2">
                        <a href="/" className="icon-link me-3" onClick={(e) => {e.preventDefault(); handleShowCategory(category);}} data-bs-toggle="modal" data-bs-target="#editCategoryModal">
                          <i className="bi bi-pencil-square edit-icon"></i></a>
                        <a href="/" className="icon-link" onClick={(e) => {e.preventDefault(); handleShowCategory(category); handleDeleteCategory();}}><i className="bi bi-trash-fill delete-icon"></i></a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-12">
              <p className="text-center text-muted">{searchTerm ? "No categories match your search." : "No categories found. Add one to get started!"}</p>
            </div>
          )}
        </div>

        <div className="modal fade" id="descCategoryModal" tabIndex="-1" aria-labelledby="exampleModalLabel"
          aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h1 className="modal-title fs-3" id="exampleModalLabel">{selectedCategory?.cName}</h1>
                <button type="button" className="btn-close bg-danger rounded-circle p-2"
                  data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body p-4">
                <p>{selectedCategory?.cDesc}</p>
              </div>
              <div className="modal-footer justify-content-start p-3">
                <button type="button" className="btn btn-primary" onClick={openEditModal} data-bs-toggle="modal" data-bs-target="#editCategoryModal">Edit Category</button>
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteCategory} data-bs-dismiss="modal">Delete</button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal fade" id="editCategoryModal" tabIndex="-1" aria-labelledby="exampleModalLabel"
          aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h1 className="modal-title fs-3" id="exampleModalLabel">Edit {selectedCategory?.cName}</h1>
                <button type="button" className="btn-close bg-danger rounded-circle p-2"
                  data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body p-4">
                <form>
                  <div className="mb-3">
                    <label htmlFor="editCategoryName" className="form-label">Category Name</label>
                    <input type="text" className="form-control shadow-sm" id="editCategoryName" name="cName" value={editDetails.cName} onChange={handleOnEditChange} />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="editCategoryDesc" className="form-label">Category Description</label>
                    <input type="text" className="form-control shadow-sm" id="editCategoryDesc" name="cDesc" value={editDetails.cDesc} onChange={handleOnEditChange} />
                  </div>
                </form>
              </div>
              <div className="modal-footer justify-content-start p-3">
                <button type="button" className="btn btn-primary" onClick={handleEditCategory} data-bs-dismiss="modal">Save Changes</button>
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteCategory} data-bs-dismiss="modal">Delete</button>
              </div>
            </div>
          </div>
        </div>

        </div>
    </>
  )
}

export default Category