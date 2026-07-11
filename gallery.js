const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
const allItems = Array.from(document.querySelectorAll(".gallery-item"));
const modal = document.querySelector(".gallery-modal");
const modalArt = document.querySelector(".modal-art");
const modalTitle = document.querySelector("#modal-title");
const modalPrice = document.querySelector(".modal-price");
const modalDesc = document.querySelector(".modal-desc");
const modalCount = document.querySelector(".modal-count");
const closeButton = document.querySelector(".modal-close");
const prevButton = document.querySelector(".modal-prev");
const nextButton = document.querySelector(".modal-next");

let visibleItems = [...allItems];
let currentIndex = 0;

function setFilter(filter) {
  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === filter);
  });

  allItems.forEach((item) => {
    const shouldShow = filter === "all" || item.dataset.type === filter;
    item.hidden = !shouldShow;
  });

  visibleItems = allItems.filter((item) => !item.hidden);
}

function openModal(index) {
  if (!visibleItems.length) return;
  currentIndex = index;
  renderModal();
  modal.hidden = false;
  document.body.classList.add("modal-open");
  closeButton.focus();
}

function closeModal() {
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function renderModal() {
  const item = visibleItems[currentIndex];
  const image = item.querySelector(".sample-image");
  modalArt.className = `modal-art ${Array.from(image.classList).filter((name) => name !== "sample-image").join(" ")}`;
  modalTitle.textContent = item.dataset.title;
  modalPrice.textContent = item.dataset.price;
  modalDesc.textContent = item.dataset.desc;
  modalCount.textContent = `${currentIndex + 1} / ${visibleItems.length}`;
}

function moveModal(direction) {
  currentIndex = (currentIndex + direction + visibleItems.length) % visibleItems.length;
  renderModal();
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

allItems.forEach((item) => {
  item.querySelector(".gallery-open").addEventListener("click", () => {
    openModal(visibleItems.indexOf(item));
  });
});

const activeFilter = document.querySelector("[data-filter].active")?.dataset.filter;
if (activeFilter) setFilter(activeFilter);

closeButton.addEventListener("click", closeModal);
prevButton.addEventListener("click", () => moveModal(-1));
nextButton.addEventListener("click", () => moveModal(1));

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (modal.hidden) return;
  if (event.key === "Escape") closeModal();
  if (event.key === "ArrowLeft") moveModal(-1);
  if (event.key === "ArrowRight") moveModal(1);
});
