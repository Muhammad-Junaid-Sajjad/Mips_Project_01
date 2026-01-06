// Navigation functionality for mobile menu toggle and active link highlighting

document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu toggle functionality
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', function() {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    // Close menu when clicking on a nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  }

  // Update active link based on current page
  const currentPage = window.location.pathname.split('/').pop();
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === currentPage ||
        (currentPage === '' && href === 'index.html') ||
        (currentPage === 'index' && href === 'index.html'))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Theme toggle functionality if available
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      // Toggle theme on html element for CSS variables
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';

      document.documentElement.setAttribute('data-theme', newTheme);
      themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
      themeToggle.title = newTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';

      // Save preference to localStorage
      localStorage.setItem('theme', newTheme);
    });

    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'dark'; // Default to dark
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    themeToggle.title = savedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }
});