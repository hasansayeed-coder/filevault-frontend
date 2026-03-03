"use client" ; 

import {useState , Suspense} from 'react' ;
import {useRouter , useSearchParams} from 'next/navigation' ; 
import Link from 'next/link' ; 
import toast from 'react-hot-toast' ;
import {authApi} from '@/lib/api' ; 
import {HardDrive , Lock} from 'lucide-react' ;

function ResetPasswordForm() {
    const router = useRouter() ; 
    const searchParams = useSearchParams() ; 
    const token = searchParams.get('token') ; 
    const [password , setPassword] = useState('') ;
    const [confirmPassword , setConfirmPassword] = useState('') ;
    const [loading , setLoading] = useState(false) ;

    const handleSubmit = async(e : React.FormEvent) => {
        e.preventDefault() ; 
        if(password !== confirmPassword)return toast.error("Passwords do not match") ; 
        if(!token) return toast.error('Invalid reset token') ;
        setLoading(true) ; 


        try{

            await authApi.resetPassword({token , password}) ; 
            toast.success('Password reset successfully'); 
            router.push('/login') ;

        }catch(err : any){
            toast.error(err.response?.data?.message || 'Reset failed') ;
        }finally{
            setLoading(false) ;
        }
    } ; 

    return (
    <div className="w-full max-w-md animate-slide-up">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
          <HardDrive size={18} color="white" />
        </div>
        <span className="font-bold text-xl" style={{ color: 'var(--text)' }}>FileVault</span>
      </div>
      <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>Set new password</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Choose a strong password for your account</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">New Password</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
            <input type="password" className="input pl-8" placeholder="Min 8 chars, 1 uppercase, 1 number" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <input type="password" className="input" placeholder="Repeat your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
      <Link href="/login" className="block text-center mt-4 text-sm" style={{ color: 'var(--primary-light)' }}>Back to login</Link>
    </div>
  );
}

export default function ResetPasswordPage() {
    return(
         <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)' }}>
      <Suspense fallback={<div />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
    ) ;
}