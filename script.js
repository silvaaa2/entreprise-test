function showCategory(categoryId) {
    const categories = document.querySelectorAll('.category');
    
    categories.forEach(category => {
        category.style.display = 'none';
    });

    document.getElementById(categoryId).style.display = 'block';
}
