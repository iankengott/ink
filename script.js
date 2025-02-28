// Basic click handler for "View Details" links
document.querySelectorAll('.view-details').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    // For demonstration, show an alert.
    // Replace this with code to open a modal or expand project details.
    alert('Project details coming soon!');
  });
});
