// script.js
document.addEventListener("DOMContentLoaded", function () {
    // Add a click event listener to the link
    document.getElementById("page-link").addEventListener("click", function (e) {
      // Prevent the default link behavior (navigating to the href)
      e.preventDefault();
  
      // Add the class to trigger the transition
      document.getElementById("page-transition").classList.add("square-animation");
  
      // After a delay, navigate to the new page
      setTimeout(function () {
        window.location.href = e.target.href;
      }, 2500); // Adjust the delay to match your animation duration
    });
  });
  