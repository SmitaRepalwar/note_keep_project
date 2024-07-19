document.getElementById('signupForm').addEventListener('submit', async(event) => {
    event.preventDefault();
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    console.log('Signup Data:', { username, email, password });
     
      let options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
       },
        body: JSON.stringify({username, email, password})
      };
    
      let url = "/user_signup";

      try {
        const response = await fetch(url, options)
        const data = response.json()
        console.log(response)
        window.location.href = "/login"
      } catch (error) {
        console.log(error)
      }
});