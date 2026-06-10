import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password,setPassword]=useState('');
  const [message,setMessage]=useState('');
  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/reset-password',{token,password});
      setMessage('Password reset successful');
      setTimeout(()=>navigate('/login'),1500);
    } catch(err){
      setMessage(err.response?.data?.detail || 'Password reset failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4">Reset Password</h2>
        {message && <div className="mb-3">{message}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input className="input-field" type="password" placeholder="New Password" value={password} onChange={(e)=>setPassword(e.target.value)} required/>
          <button className="btn-primary">Update Password</button>
        </form>
      </div>
    </div>
  )
}
