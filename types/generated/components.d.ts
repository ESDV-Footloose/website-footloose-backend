import type { Schema, Struct } from '@strapi/strapi';

export interface NavbarDropdown extends Struct.ComponentSchema {
  collectionName: 'components_navbar_dropdowns';
  info: {
    displayName: 'Dropdown';
  };
  attributes: {
    items: Schema.Attribute.Component<'navbar.link', true>;
    text: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'#'>;
  };
}

export interface NavbarLink extends Struct.ComponentSchema {
  collectionName: 'components_navbar_links';
  info: {
    displayName: 'Link';
  };
  attributes: {
    text: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'navbar.dropdown': NavbarDropdown;
      'navbar.link': NavbarLink;
    }
  }
}
