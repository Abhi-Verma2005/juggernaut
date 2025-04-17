'use client'
import SignIn from '@/components/SignIn'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'


function SignInPage() {
  const { data: session } = useSession()
  const Router = useRouter()
  useEffect(() => {
    if (session?.user?.email) {
      Router.push('/')
    }
  }, [session])
  return (
    <div>
      {!session?.user?.email && <SignIn/> }
      
    </div>
  )
}

export default SignInPage
