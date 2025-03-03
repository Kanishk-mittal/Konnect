import React from 'react'
import { useState } from 'react'
import axios from 'axios'
import JSEncrypt from "jsencrypt";


const Login = () => {
    //State for roll and password
    const [roll, setroll] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async () => {
        // getting RSA public key
        const { data } = await axios.post('http://localhost:5000/publicKey')
        const publicKeyPem = data.public_key
        const key = new JSEncrypt();
        key.setPublicKey(publicKeyPem);

        // Encrypting roll and password
        const encryptedroll = key.encrypt(roll, 'base64');
        const encryptedPassword = key.encrypt(password, 'base64');

        // creating template for axios instance
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
        // sending encrypted roll and password to backend
        const response = await instance.post('/login', {
            roll: encryptedroll,
            password: encryptedPassword
        })
    }

    return (
        // Modify the code below as per the desing
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
            </div>
        </>
    )
}

export default Login
