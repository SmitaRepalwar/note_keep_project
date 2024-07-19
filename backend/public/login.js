    document.getElementById('loginForm').addEventListener('submit', async(event) => {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    console.log('Login Data:', { username, password });

    let options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
     },
      body: JSON.stringify({username, password})
    };
  
    let url = "/user_login";

    try {
      const response = await fetch(url, options)
      const data = await response.json()
      localStorage.setItem("my_token", data.token)
      userId = response.userId
      window.location.href = "/"
    } catch (error) {
      console.log(error)
    }
});


