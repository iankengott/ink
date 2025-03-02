// Basic click handler for "View Details" links
document.querySelectorAll('.view-details').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    alert('Project details coming soon!');
  });
});



document.addEventListener('DOMContentLoaded', function () {
  // Select all project cards and modal elements
  const projectCards = document.querySelectorAll('.project-card');
  const modal = document.getElementById('modal');
  const modalImage = document.getElementById('modal-image');
  const modalText = document.getElementById('modal-text');
  const closeModal = document.querySelector('.close');

  // Add click event to each project card
  projectCards.forEach(card => {
    card.addEventListener('click', function (event) {
      event.preventDefault();
      // Retrieve data attributes
      const imgSrc = card.getAttribute('data-image');
      const text = card.getAttribute('data-text');
      
      // Set modal content
      modalImage.src = imgSrc;
      modalText.textContent = text;
      
      // Display the modal
      modal.style.display = 'block';
    });
  });

  // Close modal when the close button is clicked
  closeModal.addEventListener('click', function () {
    modal.style.display = 'none';
  });

  // Close modal if the user clicks outside the modal content
  window.addEventListener('click', function (event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
});
