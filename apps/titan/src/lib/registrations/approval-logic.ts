import { createClient } from '@/lib/supabase/server'

export async function approveRegistration({ registrationType, data }: { registrationType: string; data: any }) {
  const supabase = await createClient()

  let tableName = ''
  if (registrationType === 'federacao') {
    tableName = `user_fed_${data.federacao_initials}`
  } else if (registrationType === 'academia') {
    tableName = `user_acad_${data.academia_initials}`
  } else {
    tableName = 'user_atl_auto'
  }

  const { error } = await supabase
    .from(tableName)
    .insert(data)

  return { success: !error, error }
}
