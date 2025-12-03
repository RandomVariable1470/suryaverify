# 🔒 Security Guidelines for SuryaVerify

## ⚠️ CRITICAL: API Key Security

This repository uses sensitive API keys that **MUST NOT** be committed to version control.

### Before Pushing to GitHub

1. **Verify .env is gitignored**
   ```bash
   git check-ignore .env
   ```
   Should output: `.env`

2. **Check for accidentally committed secrets**
   ```bash
   git log --all --full-history -- .env
   ```
   Should return nothing. If it shows commits, see "Emergency: Keys Already Committed" below.

3. **Scan for exposed keys in code**
   ```bash
   grep -r "AIza" src/
   grep -r "pk.eyJ" src/
   ```
   Should return nothing (keys should only be in .env file).

### Setup for New Users

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your own API keys:
   - **Mapbox Token**: Get from https://account.mapbox.com/access-tokens/
   - **Gemini API Key**: Get from https://aistudio.google.com/app/apikey

3. **Never commit the .env file!**

### Emergency: Keys Already Committed

If you accidentally committed API keys:

1. **Immediately revoke the exposed keys**:
   - Mapbox: https://account.mapbox.com/access-tokens/
   - Gemini: https://aistudio.google.com/app/apikey

2. **Remove from Git history**:
   ```bash
   # Install BFG Repo Cleaner
   brew install bfg  # or download from https://rtyley.github.io/bfg-repo-cleaner/
   
   # Remove .env from all commits
   bfg --delete-files .env
   
   # Clean up
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   
   # Force push (WARNING: This rewrites history!)
   git push --force
   ```

3. **Generate new API keys** and add them to a fresh `.env` file.

### Production Deployment

For production deployments:

1. **Use environment variables** from your hosting platform (Vercel, Netlify, etc.)
2. **Never hardcode keys** in the source code
3. **Implement a backend API** to proxy requests and keep keys server-side
4. **Add rate limiting** to prevent API abuse
5. **Monitor API usage** for suspicious activity

### Additional Security Measures

- [ ] Enable GitHub secret scanning
- [ ] Add pre-commit hooks to check for secrets
- [ ] Use different API keys for development and production
- [ ] Implement API key rotation policy
- [ ] Set up usage alerts for your API keys

## 🛡️ Best Practices

1. **Principle of Least Privilege**: Only grant necessary permissions to API keys
2. **Regular Audits**: Review API key usage monthly
3. **Separate Keys**: Use different keys for different environments
4. **Documentation**: Keep this security guide updated

## 📞 Reporting Security Issues

If you discover a security vulnerability, please email: [your-email@example.com]

**DO NOT** open a public GitHub issue for security vulnerabilities.
