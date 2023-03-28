const sitePassword = import.meta.env.SITE_PASSWORD

export function validatePass(pass: string) {
  if (sitePassword && sitePassword !== pass) {
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
