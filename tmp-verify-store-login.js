const base = 'http://localhost:3004';

(async () => {
  const username = 'shopverify' + Date.now();
  const email = username + '@example.com';
  const password = 'pass1234';

  const regResponse = await fetch(base + '/api/community/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  const regResult = await regResponse.json();
  console.log('register', regResponse.status, regResult.message || JSON.stringify(regResult));

  const loginResponse = await fetch(base + '/api/community/password-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, rememberLogin: true })
  });
  const loginResult = await loginResponse.json();
  console.log('login', loginResponse.status, JSON.stringify(loginResult));
  console.log('token', loginResult.token || '');
})();
