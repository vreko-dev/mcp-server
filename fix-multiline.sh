#!/bin/bash

# Fix multi-line malformed await syntax

cd /Users/user1/WebstormProjects/SnapBack-Site

# Fix OrganizationMembersList.tsx - updateMemberRole
perl -i -0777 -pe 's/async \(\) => \{\n\s+\/\/ await authClient\.organization\.updateMemberRole\(\{\n([^\}]+)\}\);/async () => {\n\t\t\t\t\/\/ TODO: Replace with actual auth client when backend is ready\n\t\t\t\t\/\/ await authClient.organization.updateMemberRole({ memberId, role, organizationId });\n\t\t\t\tawait Promise.resolve();/gs' apps/web/modules/saas/organizations/components/OrganizationMembersList.tsx

# Fix OrganizationMembersList.tsx - removeMember
perl -i -0777 -pe 's/async \(\) => \{\n\s+\/\/ await authClient\.organization\.removeMember\(\{\n([^\}]+)\}\);/async () => {\n\t\t\t\t\/\/ TODO: Replace with actual auth client when backend is ready\n\t\t\t\t\/\/ await authClient.organization.removeMember({ memberIdOrEmail: memberId, organizationId });\n\t\t\t\tawait Promise.resolve();/gs' apps/web/modules/saas/organizations/components/OrganizationMembersList.tsx

# Fix organizations/lib/api.ts - all instances
perl -i -0777 -pe 's/const \{ data, error \} = \/\/ await authClient\.organization\.list\(\);/\/\/ TODO: Replace with actual auth client when backend is ready\n\t\t\t\/\/ const { data, error } = await authClient.organization.list();\n\t\t\tconst { data, error } = { data: null, error: null };/gs' apps/web/modules/saas/organizations/lib/api.ts

perl -i -0777 -pe 's/const \{ data, error \} = \/\/ await authClient\.organization\.getFullOrganization\(\n\s+\{[^\}]+\},\n\s+\);/\/\/ TODO: Replace with actual auth client when backend is ready\n\t\t\t\/\/ const { data, error } = await authClient.organization.getFullOrganization({...});\n\t\t\tconst { data, error } = { data: null, error: null };/gs' apps/web/modules/saas/organizations/lib/api.ts

perl -i -0777 -pe 's/const \{ error, data \} = \/\/ await authClient\.organization\.create\(\{([^\}]+)\}\);/\/\/ TODO: Replace with actual auth client when backend is ready\n\t\t\t\/\/ const { error, data } = await authClient.organization.create({ name, slug, metadata });\n\t\t\tconst { error, data } = { error: null, data: null };/gs' apps/web/modules/saas/organizations/lib/api.ts

perl -i -0777 -pe 's/const \{ error, data \} = \/\/ await authClient\.organization\.update\(\{([^\}]+)\}\);/\/\/ TODO: Replace with actual auth client when backend is ready\n\t\t\t\/\/ const { error, data } = await authClient.organization.update({...});\n\t\t\tconst { error, data } = { error: null, data: null };/gs' apps/web/modules/saas/organizations/lib/api.ts

echo "Fixed multi-line await syntax"
