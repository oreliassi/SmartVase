<script>
    fetch("https://smartvase.onrender.com")
  .then(response => response.json())
  .then(data => {
        console.log("Products from Odoo:", data);
    // כאן את יכולה להציג אותם באתר
  });
</script>
