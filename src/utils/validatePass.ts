const sitePassword = import.meta.env.SITE_PASSWORD

export function validatePassword(pass: string) {
  if (sitePassword && sitePassword !== pass)
    return false
  return true
}

export function validatePass(pass: string) {
  if (validatePassword(pass)) {
    return new Response(
      JSON.stringify({
        error: {
          message: 'Invalid password.',
        },
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
  return undefined
}
