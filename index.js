const navMenu = document.querySelector('#navMenu');
const menuBtn = document.querySelector('#menuBtn');

menuBtn.addEventListener('click', () => {
    if (navMenu.style.display === 'none') {
        navMenu.style.display = 'block';
    }
    else {
        navMenu.style.display = 'none';
    }
});

