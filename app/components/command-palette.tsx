import { useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import {
  FileTextIcon,
  HomeIcon,
  LayoutDashboardIcon,
  PenToolIcon,
  SearchIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react'
import * as React from 'react'

import { api } from '../../convex/_generated/api'

import type { Doc } from '../../convex/_generated/dataModel'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '~/components/ui/command'
import { Kbd } from '~/components/ui/kbd'
import { useCurrentUser } from '~/features/auth'
import { ROLE_OPTIONS } from '~/features/auth/constants'

/** Whether the role switcher UI should be visible. */
const showRoleSwitcher =
  import.meta.env.DEV || !!import.meta.env.VITE_SHOW_ROLE_SWITCHER

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  roles?: Array<Doc<'users'>['role']>
}

const NAV_ITEMS: Array<NavItem> = [
  { label: 'Home', to: '/', icon: <HomeIcon className="size-4" /> },
  {
    label: 'Published Articles',
    to: '/article',
    icon: <FileTextIcon className="size-4" />,
  },
  {
    label: 'Editor Dashboard',
    to: '/editor',
    icon: <LayoutDashboardIcon className="size-4" />,
    roles: ['editor_in_chief', 'action_editor', 'admin'],
  },
  {
    label: 'Submit Paper',
    to: '/submit',
    icon: <PenToolIcon className="size-4" />,
    roles: ['author', 'admin'],
  },
  {
    label: 'Review Workspace',
    to: '/review',
    icon: <UsersIcon className="size-4" />,
    roles: ['reviewer', 'admin'],
  },
  {
    label: 'Admin Panel',
    to: '/admin',
    icon: <ShieldIcon className="size-4" />,
    roles: ['admin'],
  },
]

export function CommandPalette({
  isBootstrapped,
  open,
  onOpenChange,
}: {
  isBootstrapped: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const switchRole = useMutation(api.users.switchRole)
  const user = useCurrentUser(isBootstrapped)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true
    if (!user) return false
    return item.roles.includes(user.role)
  })

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} showCloseButton={false}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {showRoleSwitcher && user && (
          <>
            <CommandGroup heading="Switch Role">
              {ROLE_OPTIONS.map((role) => (
                <CommandItem
                  key={role.value}
                  onSelect={() => {
                    switchRole({ role: role.value }).catch(
                      (error: unknown) => {
                        console.error('Failed to switch role:', error)
                      },
                    )
                    onOpenChange(false)
                  }}
                >
                  <UserIcon className="size-4" />
                  <span>{role.label}</span>
                  {user.role === role.value && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Current
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Go To">
          {visibleNavItems.map((item) => (
            <CommandItem
              key={item.to}
              onSelect={() => {
                void navigate({ to: item.to })
                onOpenChange(false)
              }}
            >
              {item.icon}
              <span>{item.label}</span>
              <Kbd className="ml-auto">{item.to}</Kbd>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Search">
          <CommandItem disabled>
            <SearchIcon className="size-4" />
            <span>Search submissions...</span>
            <Kbd className="ml-auto">Coming soon</Kbd>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
