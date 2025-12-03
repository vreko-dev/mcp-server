#!/bin/bash

# Script to fix all malformed 'await //' syntax in SaaS module files

# Files with the broken pattern
files=(
  "apps/web/modules/saas/organizations/components/InviteMemberForm.tsx"
  "apps/web/modules/saas/organizations/components/OrganizationInvitationsList.tsx"
  "apps/web/modules/saas/organizations/components/OrganizationLogoForm.tsx"
  "apps/web/modules/saas/organizations/components/OrganizationMembersList.tsx"
  "apps/web/modules/saas/organizations/components/ChangeOrganizationNameForm.tsx"
  "apps/web/modules/saas/organizations/components/ActiveOrganizationProvider.tsx"
  "apps/web/modules/saas/organizations/components/DeleteOrganizationForm.tsx"
  "apps/web/modules/saas/organizations/components/OrganizationInvitationModal.tsx"
  "apps/web/modules/saas/organizations/lib/api.ts"
  "apps/web/modules/saas/settings/components/DeleteAccountForm.tsx"
  "apps/web/modules/saas/settings/components/ChangeNameForm.tsx"
  "apps/web/modules/saas/settings/components/ChangePassword.tsx"
  "apps/web/modules/saas/settings/components/ChangeEmailForm.tsx"
  "apps/web/modules/saas/settings/components/PasskeysBlock.tsx"
  "apps/web/modules/saas/settings/components/UserAvatarUpload.tsx"
  "apps/web/modules/saas/settings/components/ActiveSessionsBlock.tsx"
  "apps/web/modules/saas/settings/components/TwoFactorBlock.tsx"
  "apps/web/modules/saas/settings/components/SetPassword.tsx"
  "apps/web/modules/saas/admin/component/organizations/OrganizationList.tsx"
  "apps/web/modules/saas/admin/component/users/UserList.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    # This sed command comments out lines starting with 'await //'
    perl -i -pe 's/(\s*)await \/\/ (.*)$/$1\/\/ await $2/g' "$file"
  fi
done

echo "Done!"
