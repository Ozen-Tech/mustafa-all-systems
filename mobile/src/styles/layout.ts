import { ViewStyle } from 'react-native';
import { colors, theme } from './theme';

/** Tokens de layout compartilhados entre telas. */
export const layout = {
  screenPaddingHorizontal: theme.spacing.lg,
  screenPaddingBottom: theme.spacing.xl,
  sectionGap: theme.spacing.lg,
  contentGap: theme.spacing.md,
};

export const screenStyles = {
  root: {
    flex: 1,
    backgroundColor: colors.dark.background,
  } as ViewStyle,
  content: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingBottom: layout.screenPaddingBottom,
    gap: layout.sectionGap,
  } as ViewStyle,
  headerBand: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    backgroundColor: colors.dark.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  } as ViewStyle,
};
