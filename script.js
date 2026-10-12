"use strict";

const bakeryProducts = [
  { id: "loaf", name: "Signature Loaf", description: "A hearty loaf for slicing and sharing.", price: "$8 per loaf" },
  { id: "cookies", name: "Cookies", description: "A sweet treat for home or the office.", price: "$3 to $4 each" },
  { id: "cake", name: "Celebration Cake", description: "A cake for your next special occasion.", price: "$35 to $75" }
];
const favoriteKey = "northStarFavorites";
let favoriteIds = [];
let storageAvailable = true;

function readFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(favoriteKey) || "[]");
    if (!Array.isArray(saved)) return [];
    return [...new Set(saved.filter(id => bakeryProducts.some(item => item.id === id)))];
  } catch (error) {
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(favoriteKey, JSON.stringify(favoriteIds));
    storageAvailable = true;
  } catch (error) {
    storageAvailable = false;
  }
}

function getFavoriteNames() {
  return bakeryProducts.filter(item => favoriteIds.includes(item.id)).map(item => item.name);
}

function renderFavorites() {
  const list = document.getElementById("favorite-list");
  if (!list) return;
  list.replaceChildren();
  getFavoriteNames().forEach(name => {
    const item = document.createElement("li");
    item.textContent = name;
    list.append(item);
  });
  document.getElementById("favorite-count").textContent = favoriteIds.length === 0
    ? "No favorites saved yet."
    : `${favoriteIds.length} favorite${favoriteIds.length === 1 ? "" : "s"} saved on this browser.`;
  document.querySelectorAll("[data-favorite-id]").forEach(button => {
    const selected = favoriteIds.includes(button.dataset.favoriteId);
    button.setAttribute("aria-pressed", String(selected));
    button.textContent = selected ? "Saved — remove" : "Save favorite";
  });
  document.getElementById("clear-favorites").disabled = favoriteIds.length === 0;
  document.getElementById("storage-message").textContent = storageAvailable ? ""
    : "Your favorites work for this visit, but this browser could not save them for later.";
}

function toggleFavorite(id) {
  if (!bakeryProducts.some(item => item.id === id)) return;
  favoriteIds = favoriteIds.includes(id)
    ? favoriteIds.filter(savedId => savedId !== id)
    : [...favoriteIds, id];
  saveFavorites();
  renderFavorites();
}

function setupFavorites() {
  const container = document.getElementById("favorite-products");
  if (!container) return;
  bakeryProducts.forEach(product => {
    const card = document.createElement("article");
    card.className = "favorite-product";
    const heading = document.createElement("h3");
    heading.textContent = product.name;
    const description = document.createElement("p");
    description.textContent = product.description;
    const price = document.createElement("p");
    price.textContent = product.price;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button favorite-button";
    button.dataset.favoriteId = product.id;
    button.setAttribute("aria-label", `Save or remove ${product.name} as a favorite`);
    button.addEventListener("click", () => toggleFavorite(product.id));
    card.append(heading, description, price, button);
    container.append(card);
  });
  document.getElementById("clear-favorites").addEventListener("click", () => {
    favoriteIds = [];
    saveFavorites();
    renderFavorites();
  });
  renderFavorites();
}

function getFormErrors(values, today = new Date()) {
  const errors = {};
  if (values.name.length < 2 || values.name.length > 80) {
    errors["customer-name"] = "Please enter a name between 2 and 80 characters.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 254) {
    errors.email = "Please enter a valid email, like name@example.com.";
  }
  if (!["preorder", "question"].includes(values.type)) {
    errors["request-type"] = "Please choose a request type.";
  }
  if (values.details.length < 10 || values.details.length > 2000) {
    errors["item-details"] = "Please enter between 10 and 2,000 characters for your details or question.";
  }
  if (values.allergies.length > 1000) {
    errors["allergy-notes"] = "Please keep allergy notes to 1,000 characters or fewer.";
  }
  if (values.type === "preorder" && !values.pickup) {
    errors["pickup-date"] = "Please choose a pickup date for your preorder.";
  } else if (values.pickup) {
    const pickup = new Date(`${values.pickup}T00:00:00`);
    const earliest = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const leadDays = values.type === "preorder" ? (/cake/i.test(values.details) ? 5 : 2) : 0;
    earliest.setDate(earliest.getDate() + leadDays);
    if (Number.isNaN(pickup.getTime()) || pickup < earliest) {
      errors["pickup-date"] = leadDays > 0
        ? `Please choose a pickup date at least ${leadDays} days from today.`
        : "Please choose today or a future date.";
    } else if (values.type === "preorder" && pickup.getDay() === 1) {
      errors["pickup-date"] = "We are closed Mondays. Please choose another pickup day.";
    }
  }
  return errors;
}

function readFormValues(form) {
  return {
    name: form.elements.customer_name.value.trim(),
    email: form.elements.email.value.trim(),
    type: form.elements.request_type.value,
    pickup: form.elements.pickup_date.value,
    details: form.elements.item_details.value.trim(),
    allergies: form.elements.allergy_notes.value.trim()
  };
}

function showFormErrors(errors) {
  const fieldIds = ["customer-name", "email", "request-type", "pickup-date", "item-details", "allergy-notes"];
  fieldIds.forEach(id => {
    const field = document.getElementById(id);
    document.getElementById(`${id}-error`).textContent = errors[id] || "";
    field.setAttribute("aria-invalid", String(Boolean(errors[id])));
  });
}

function setupForm() {
  const form = document.getElementById("request-form");
  if (!form) return;
  form.noValidate = true;
  let attemptedSubmit = false;
  const names = getFavoriteNames();
  const savedText = document.getElementById("saved-favorites-text");
  savedText.textContent = names.length ? `Your saved favorites: ${names.join(", ")}.`
    : "Save items on the Products page to bring your favorites into this form.";
  const useFavorites = document.getElementById("use-favorites");
  useFavorites.hidden = names.length === 0;
  useFavorites.addEventListener("click", () => {
    const field = document.getElementById("item-details");
    const line = `Items I am interested in: ${names.join(", ")}.`;
    if (!field.value.includes(line)) field.value += `${field.value.trim() ? "\n" : ""}${line}`;
    if (attemptedSubmit) showFormErrors(getFormErrors(readFormValues(form)));
    field.focus();
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    attemptedSubmit = true;
    const errors = getFormErrors(readFormValues(form));
    showFormErrors(errors);
    const status = document.getElementById("form-status");
    const ids = Object.keys(errors);
    status.textContent = ids.length
      ? "Please fix the fields marked below. Your entries are still here."
      : "Your request looks ready. This demo does not send it to the bakery.";
    status.className = ids.length ? "form-status has-errors" : "form-status";
    if (ids.length) document.getElementById(ids[0]).focus();
  });
  form.addEventListener("input", () => {
    if (!attemptedSubmit) return;
    const errors = getFormErrors(readFormValues(form));
    showFormErrors(errors);
    document.getElementById("form-status").textContent = Object.keys(errors).length
      ? "Please fix the fields marked below. Your entries are still here."
      : "Your fields look good. Select Check my request to continue.";
  });
}

function startBakery() {
  favoriteIds = readFavorites();
  setupFavorites();
  setupForm();
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", startBakery);
}
