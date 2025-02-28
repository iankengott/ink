// Basic click handler for "View Details" links
document.querySelectorAll('.view-details').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    alert('Project details coming soon!');
  });
});
