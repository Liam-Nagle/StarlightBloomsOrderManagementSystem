/**
 * Mobile Navigation Toggle
 */

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const menuOverlay = document.querySelector('.menu-overlay');

    if (menuToggle && navMenu && menuOverlay) {
        // Toggle menu
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            menuOverlay.classList.toggle('active');
        });

        // Close menu when clicking overlay
        menuOverlay.addEventListener('click', () => {
            navMenu.classList.remove('active');
            menuOverlay.classList.remove('active');
        });

        // Close menu when clicking a nav link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                menuOverlay.classList.remove('active');
            });
        });
    }
});
