#!/usr/bin/env python3
import os
import sys
import requests
import json

# Load env vars
supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not supabase_url or not supabase_key:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

email = "luizpavani@gmail.com"
password = "Gold8892#"

print(f"🔧 Setting master_access for {email}")

# Create user via HTTP API
headers = {
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json",
    "apikey": supabase_key,
}

# Try to create user
auth_url = f"{supabase_url}/auth/v1/admin/users"
user_data = {
    "email": email,
    "password": password,
    "email_confirm": True,
}

response = requests.post(auth_url, json=user_data, headers=headers)

user_id = None

if response.status_code == 201:
    user_id = response.json()["id"]
    print(f"✅ User {email} created with ID: {user_id}")
elif response.status_code == 422:
    print(f"⚠️  User might already exist, getting user list...")
    # Get user list to find the ID
    list_url = f"{auth_url}?limit=1000"
    list_response = requests.get(list_url, headers=headers)
    if list_response.status_code == 200:
        users = list_response.json()
        if isinstance(users, list):
            for user in users:
                if isinstance(user, dict) and user.get("email") == email:
                    user_id = user["id"]
                    print(f"✅ Found existing user {email} with ID: {user_id}")
                    # Update password
                    update_url = f"{auth_url}/{user_id}"
                    update_response = requests.put(
                        update_url,
                        json={"password": password},
                        headers=headers
                    )
                    if update_response.status_code == 200:
                        print(f"✅ Password updated for {email}")
                    else:
                        print(f"⚠️  Could not update password: {update_response.text}")
                    break
        elif isinstance(users, dict):
            users_list = users.get("users", [])
            for user in users_list:
                if user.get("email") == email:
                    user_id = user["id"]
                    print(f"✅ Found existing user {email} with ID: {user_id}")
                    # Update password
                    update_url = f"{auth_url}/{user_id}"
                    update_response = requests.put(
                        update_url,
                        json={"password": password},
                        headers=headers
                    )
                    if update_response.status_code == 200:
                        print(f"✅ Password updated for {email}")
                    else:
                        print(f"⚠️  Could not update password: {update_response.text}")
                    break
else:
    print(f"❌ Could not create/get user: {response.status_code} - {response.text}")
    sys.exit(1)

if not user_id:
    print(f"❌ Could not find user {email}")
    sys.exit(1)

# Insert master_access role via HTTP API
roles_url = f"{supabase_url}/rest/v1/user_roles"
role_data = {
    "user_id": user_id,
    "role": "master_access",
}

# Add apikey header which might bypass RLS
http_headers = headers.copy()
http_headers["Prefer"] = "return=representation"

# First delete existing roles
delete_url = f"{roles_url}?user_id=eq.{user_id}"
delete_response = requests.delete(delete_url, headers=http_headers)
if delete_response.status_code in [204, 200]:
    print(f"✅ Deleted existing roles for {user_id}")
else:
    print(f"⚠️  Could not delete old roles: {delete_response.status_code}")

# Insert new role
insert_response = requests.post(roles_url, json=role_data, headers=http_headers)
if insert_response.status_code in [200, 201]:
    print(f"✅ Master access assigned to {email}")
else:
    print(f"❌ Could not assign master_access role: {insert_response.status_code}")
    print(f"   Response: {insert_response.text}")
    # Try via SQL instead
    print(f"\n🔧 Trying SQL insert approach...")
    sql_url = f"{supabase_url}/rest/v1/rpc/execute_sql"
    sql_query = f"""
    INSERT INTO user_roles (user_id, role, federacao_id, academia_id)
    VALUES ('{user_id}', 'master_access', NULL, NULL)
    ON CONFLICT (user_id) DO UPDATE 
    SET role = 'master_access'
    """
    sql_response = requests.post(
        sql_url, 
        json={"sql": sql_query},
        headers=http_headers
    )
    if sql_response.status_code in [200, 201]:
        print(f"✅ Master access assigned to {email} via SQL")
    else:
        print(f"❌ SQL insert also failed: {sql_response.status_code}")
        print(f"   Response: {sql_response.text}")
        sys.exit(1)

print(f"\n✅ SUCCESS! User {email} is now master_access")
print(f"   Password: {password}")
print(f"   User ID: {user_id}")

