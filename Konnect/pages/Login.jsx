import React from 'react'
import { useState } from 'react'
import axios from 'axios'
import JSEncrypt from "jsencrypt";


const Login = () => {
    const [roll, setroll] = useState('')
    const [password, setPassword] = useState('')
    const instance = axios.create({
        withCredentials: true,
        baseURL: "http://localhost:5000",
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })

    const logOut = async () => {
        try {
            // Extract CSRF token from cookies
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf_access_token='))
                ?.split('=')[1];

            if (!csrfToken) {
                console.error("CSRF token not found");
                return;
            }

            // Send request with CSRF token
            const response = await instance.post('/logout', {}, {
                withCredentials: true,
                headers: {
                    "X-CSRF-TOKEN": csrfToken  // Include CSRF token in the request
                }
            });

            console.log(response.data);
        } catch (error) {
            console.error("Error:", error.response?.data || error.message);
        }
    }

    const handleLogin = async () => {
        // getting RSA public key
        const { data } = await axios.post('http://localhost:5000/publicKey')
        const publicKeyPem = data.public_key
        const key = new JSEncrypt();
        key.setPublicKey(publicKeyPem);;
        const encryptedroll = key.encrypt(roll, 'base64');
        const encryptedPassword = key.encrypt(password, 'base64');
        console.log("roll:- " + encryptedroll)
        console.log("Password:- " + encryptedPassword)
        const response = await instance.post('/login', {
            roll: encryptedroll,
            password: encryptedPassword
        })
        console.log(response.data)
    }
    const testLogin = async () => {
        try {
            // Extract CSRF token from cookies
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf_access_token='))
                ?.split('=')[1];

            if (!csrfToken) {
                console.error("CSRF token not found");
                return;
            }

            // Send request with CSRF token
            const response = await instance.post('/protected', {}, {
                withCredentials: true,
                headers: {
                    "X-CSRF-TOKEN": csrfToken  // Include CSRF token in the request
                }
            });

            console.log(response.data);
        } catch (error) {
            console.error("Error:", error.response?.data || error.message);
        }
    };



    return (
        <>
            <div>
            </div>
            <h1>Vite + React</h1>
            <div className="card">
                <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                    <div>
                        <label>
                            roll:
                            <input
                                type="text"
                                value={roll}
                                onChange={(e) => setroll(e.target.value)}
                            />
                        </label>
                    </div>
                    <div>
                        <label>
                            Password:
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </label>
                    </div>
                    <button type="submit">Login</button>

                </form>
                <button onClick={logOut}>Logout</button>
                <button onClick={testLogin}>Test</button>
            </div>
        </>
    )
}

export default Login
